/**
 * Privacy Shield - IndexedDB Vault & Persistent Local Storage Engine
 * Stores masked entities, token registry, and privacy audit logs securely inside browser IndexedDB.
 * Guarantees zero reliance on insecure cookies or temporary memory.
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

        // 1. Vault Store: stores masked sensitive items
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
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        reject(event.target.error || new Error('Failed to open IndexedDB'));
      };
    });
  }

  /**
   * Save a single vault record to IndexedDB
   */
  async function saveVaultRecord(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readwrite');
      const store = tx.objectStore('vault');

      const item = {
        id: record.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        category: record.category || 'other',
        masked: record.masked || '••••••••',
        token: record.token || `[PROTECTED_${(record.category || 'PII').toUpperCase()}]`,
        domain: record.domain || (global.location ? global.location.hostname : 'unknown'),
        url: record.url || (global.location ? global.location.href : ''),
        elementTag: record.elementTag || '',
        elementId: record.elementId || '',
        timestamp: record.timestamp || new Date().toISOString()
      };

      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Batch save vault records to IndexedDB
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

      records.forEach((rec, idx) => {
        const item = {
          id: rec.id || `vault_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          category: rec.category || 'other',
          masked: rec.masked || '••••••••',
          token: rec.token || `[PROTECTED_${(rec.category || 'PII').toUpperCase()}]`,
          domain: rec.domain || (global.location ? global.location.hostname : 'unknown'),
          url: rec.url || (global.location ? global.location.href : ''),
          elementTag: rec.elementTag || '',
          elementId: rec.elementId || '',
          timestamp: rec.timestamp || new Date().toISOString()
        };
        store.put(item);
        saved.push(item);
      });
    });
  }

  /**
   * Retrieve all records from Vault
   */
  async function getAllVaultRecords() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vault'], 'readonly');
      const store = tx.objectStore('vault');
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result || [];
        // Sort descending by timestamp
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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

  /**
   * Add entry to Audit Logs
   */
  async function addAuditLog(entry) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['audit_logs'], 'readwrite');
      const store = tx.objectStore('audit_logs');

      const logItem = {
        action: entry.action || 'SCAN',
        message: entry.message || '',
        category: entry.category || 'shield',
        domain: entry.domain || (global.location ? global.location.hostname : 'unknown'),
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
   * Retrieve Audit Logs
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
        resolve(results.slice(0, limit));
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
    saveVaultRecord,
    saveVaultRecordsBatch,
    getAllVaultRecords,
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
})(typeof self !== 'undefined' ? self : this);
