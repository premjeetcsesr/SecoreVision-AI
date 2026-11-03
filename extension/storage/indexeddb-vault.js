/**
 * Privacy Shield - IndexedDB Vault & Persistent Local Storage Engine
 * Stores masked entities, token registry, and privacy audit logs securely inside browser IndexedDB.
 * Guarantees zero duplicates via deterministic canonical primary keys and automated pruning.
 */

(function (global) {
  'use strict';

  const DB_NAME = 'PrivacyShieldDB';
  const DB_VERSION = 1;

  let dbInstance = null;

  function openDB() {
    if (dbInstance) {
      return Promise.resolve(dbInstance);
    }

    return new Promise((resolve, reject) => {
      const indexedDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB;
      if (!indexedDB) {
        return reject(new Error('IndexedDB is not supported in this environment'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Vault Store: stores masked sensitive items with deterministic canonical ID as keyPath
        if (!db.objectStoreNames.contains('vault')) {
          const vaultStore = db.createObjectStore('vault', { keyPath: 'id' });
          vaultStore.createIndex('category', 'category', { unique: false });
          vaultStore.createIndex('domain', 'domain', { unique: false });
          vaultStore.createIndex('token', 'token', { unique: false });
          vaultStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 2. Audit Logs Store: logs every shield, scan, or redaction event
        if (!db.objectStoreNames.contains('audit_logs')) {
          const logStore = db.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('domain', 'domain', { unique: false });
          logStore.createIndex('action', 'action', { unique: false });
        }

        // 3. Settings Store: key-value settings for extension
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 4. Token Registry Store: securely binds tokens to element metadata
        if (!db.objectStoreNames.contains('tokens')) {
          const tokenStore = db.createObjectStore('tokens', { keyPath: 'token' });
          tokenStore.createIndex('category', 'category', { unique: false });
          tokenStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        // Run background deduplication on existing stores once DB is open
        setTimeout(() => {
          deduplicateVault().catch(() => {});
        }, 100);
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        reject(event.target.error || new Error('Failed to open IndexedDB'));
      };
    });
  }

  /**
   * Deterministic Canonical Vault ID Generator.
   * Ensures that any scan or re-detection of the same sensitive entity on the same domain
   * generates the exact same primary key, guaranteeing that IndexedDB replaces rather than duplicates.
   */
  function getCanonicalVaultId(record) {
    if (!record) return 'vault_unknown';
    const cat = (record.category || 'other').toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

    // Normalize masked representation:
    // Strip bullet points, asterisks, spaces, hyphens to get normalized anchor
    let maskedVal = (record.masked || record.token || record.rawText || 'item').toString().trim().toLowerCase();
    maskedVal = maskedVal.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (!maskedVal) maskedVal = 'masked';

    let dom = (record.domain || (global.location ? global.location.hostname : 'local')).toString().trim().toLowerCase();
    dom = dom.replace(/:\d+$/, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (!dom) dom = 'local';

    return `vault_${cat}_${maskedVal}_${dom}`;
  }

  /**
   * Save a single vault record to IndexedDB with strict deduplication
   */
  async function saveVaultRecord(record) {
    if (!record) return null;
    const db = await openDB();
    const deterministicId = getCanonicalVaultId(record);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readwrite');
      const store = tx.objectStore('vault');

      const item = {
        id: deterministicId,
        category: record.category || 'other',
        masked: record.masked || '••••••••',
        token: record.token || `[PROTECTED_${(record.category || 'PII').toUpperCase()}]`,
        domain: record.domain || (global.location ? global.location.hostname : 'unknown'),
        url: record.url || (global.location ? global.location.href : ''),
        elementTag: record.elementTag || '',
        elementId: record.elementId || '',
        timestamp: record.timestamp || record.detectedAt || new Date().toISOString()
      };

      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Batch save vault records to IndexedDB with strict in-memory and store-level deduplication
   */
  async function saveVaultRecordsBatch(records = []) {
    if (!records || records.length === 0) return [];
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readwrite');
      const store = tx.objectStore('vault');
      const saved = [];

      tx.oncomplete = () => resolve(saved);
      tx.onerror = (e) => reject(e.target.error);

      // Pre-deduplicate incoming batch by canonical ID to avoid duplicate writes in same transaction
      const batchMap = new Map();
      for (const rec of records) {
        if (!rec) continue;
        const canonicalId = getCanonicalVaultId(rec);
        batchMap.set(canonicalId, rec);
      }

      for (const [canonicalId, rec] of batchMap.entries()) {
        const item = {
          id: canonicalId,
          category: rec.category || 'other',
          masked: rec.masked || '••••••••',
          token: rec.token || `[PROTECTED_${(rec.category || 'PII').toUpperCase()}]`,
          domain: rec.domain || (global.location ? global.location.hostname : 'unknown'),
          url: rec.url || (global.location ? global.location.href : ''),
          elementTag: rec.elementTag || '',
          elementId: rec.elementId || '',
          timestamp: rec.timestamp || rec.detectedAt || new Date().toISOString()
        };
        store.put(item);
        saved.push(item);
      }
    });
  }

  /**
   * Deep deduplication & cleanup of the entire Vault in IndexedDB.
   * Finds all duplicate records (sharing the same category, masked entity, domain),
   * keeps the single latest record under the canonical deterministic ID,
   * and completely purges all redundant legacy rows from the IndexedDB store.
   */
  async function deduplicateVault() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readwrite');
      const store = tx.objectStore('vault');
      const req = store.getAll();

      req.onsuccess = () => {
        const records = req.result || [];
        if (records.length === 0) {
          return resolve({ total: 0, removed: 0, kept: 0 });
        }

        const groups = new Map();
        for (const rec of records) {
          const canonicalId = getCanonicalVaultId(rec);
          if (!groups.has(canonicalId)) {
            groups.set(canonicalId, []);
          }
          groups.get(canonicalId).push(rec);
        }

        let removed = 0;
        let kept = 0;

        for (const [canonicalId, list] of groups.entries()) {
          // Sort descending by timestamp/detectedAt so newest is first
          list.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.detectedAt || 0).getTime();
            const timeB = new Date(b.timestamp || b.detectedAt || 0).getTime();
            return timeB - timeA;
          });

          const newest = list[0];
          kept++;

          const canonicalRecord = {
            id: canonicalId,
            category: newest.category || 'other',
            masked: newest.masked || '••••••••',
            token: newest.token || `[PROTECTED_${(newest.category || 'PII').toUpperCase()}]`,
            domain: newest.domain || (global.location ? global.location.hostname : 'unknown'),
            url: newest.url || (global.location ? global.location.href : ''),
            elementTag: newest.elementTag || '',
            elementId: newest.elementId || '',
            timestamp: newest.timestamp || newest.detectedAt || new Date().toISOString()
          };

          // Save/overwrite canonical record
          store.put(canonicalRecord);

          // Purge all redundant legacy records with non-canonical IDs
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.id && item.id !== canonicalId) {
              store.delete(item.id);
              removed++;
            }
          }
        }

        tx.oncomplete = () => {
          resolve({ total: records.length, removed, kept });
        };
        tx.onerror = (e) => reject(e.target.error);
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Retrieve all records from Vault (strictly deduplicated)
   */
  async function getAllVaultRecords() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readonly');
      const store = tx.objectStore('vault');
      const req = store.getAll();

      req.onsuccess = () => {
        const rawResults = req.result || [];
        const seen = new Set();
        const results = [];

        // Sort descending by timestamp
        rawResults.sort((a, b) => new Date(b.timestamp || b.detectedAt || 0) - new Date(a.timestamp || a.detectedAt || 0));

        let hasDuplicates = false;
        for (const item of rawResults) {
          const canonicalId = getCanonicalVaultId(item);
          if (!seen.has(canonicalId)) {
            seen.add(canonicalId);
            results.push({ ...item, id: canonicalId });
          } else {
            hasDuplicates = true;
          }
        }

        // If legacy duplicates were encountered, run background pruning to keep IndexedDB clean
        if (hasDuplicates) {
          setTimeout(() => {
            deduplicateVault().catch(() => {});
          }, 30);
        }

        resolve(results);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Delete a record by ID
   */
  async function deleteVaultRecord(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readwrite');
      const store = tx.objectStore('vault');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Clear all records in Vault
   */
  async function clearVault() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readwrite');
      const store = tx.objectStore('vault');
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  let lastAuditSignature = '';
  let lastAuditTimestamp = 0;

  /**
   * Add entry to Audit Logs with anti-spam / de-duplication guard
   */
  async function addAuditLog(entry) {
    if (!entry) return null;
    const action = (entry.action || 'SCAN').toUpperCase();
    const message = (entry.message || '').trim();
    const domain = (entry.domain || (global.location ? global.location.hostname : 'unknown')).toLowerCase();
    const signature = `${action}|${message}|${domain}`;
    const now = Date.now();

    // Prevent duplicate audit logs for identical action+message+domain within 8 seconds
    if (signature === lastAuditSignature && (now - lastAuditTimestamp) < 8000) {
      return null;
    }
    lastAuditSignature = signature;
    lastAuditTimestamp = now;

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['audit_logs'], 'readwrite');
      const store = tx.objectStore('audit_logs');

      const logItem = {
        action: action,
        message: message,
        category: entry.category || 'shield',
        domain: domain,
        url: entry.url || (global.location ? global.location.href : ''),
        itemsCount: entry.itemsCount || 0,
        categoriesBreakdown: entry.categoriesBreakdown || {},
        timestamp: entry.timestamp || new Date().toISOString()
      };

      const req = store.add(logItem);
      req.onsuccess = () => resolve(logItem);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Retrieve Audit Logs (deduplicating consecutive duplicates)
   */
  async function getAuditLogs(limit = 100) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['audit_logs'], 'readonly');
      const store = tx.objectStore('audit_logs');
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        // Deduplicate consecutive identical logs
        const clean = [];
        let prevSig = '';
        for (const log of results) {
          const sig = `${log.action}|${log.message}|${log.domain}`;
          if (sig !== prevSig) {
            clean.push(log);
            prevSig = sig;
          }
        }
        resolve(clean.slice(0, limit));
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Clear Audit Logs
   */
  async function clearAuditLogs() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['audit_logs'], 'readwrite');
      const store = tx.objectStore('audit_logs');
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Set setting in IndexedDB
   */
  async function setSetting(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get setting from IndexedDB
   */
  async function getSetting(key, defaultValue = null) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result !== undefined ? req.result.value : defaultValue);
      };
      req.onerror = () => resolve(defaultValue);
    });
  }

  /**
   * Get summary statistics from Vault
   */
  async function getVaultStats() {
    const records = await getAllVaultRecords();
    const categories = {};
    records.forEach(r => {
      const cat = r.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return {
      totalRecords: records.length,
      categories,
      lastUpdated: records.length > 0 ? records[0].timestamp : null
    };
  }

  const PrivacyShieldDB = {
    openDB,
    getCanonicalVaultId,
    saveVaultRecord,
    saveVaultRecordsBatch,
    getAllVaultRecords,
    deduplicateVault,
    deleteVaultRecord,
    clearVault,
    addAuditLog,
    getAuditLogs,
    clearAuditLogs,
    setSetting,
    getSetting,
    getVaultStats
  };

  // Expose to window / worker context
  global.PrivacyShieldDB = PrivacyShieldDB;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrivacyShieldDB;
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
