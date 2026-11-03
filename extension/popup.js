/**
 * ============================================================================
 * SecureVision AI — Chrome Extension HUD & Screen Privacy Guard Controller
 * ============================================================================
 * Clean Production Agent Dashboard:
 * 1. Screen Privacy Guard (Anti-AI local DOM redaction & PII gate)
 * 2. Real-time Detection Breakdown (Cards, Passwords, Emails, Phones, SSN, Faces)
 * 3. Local Browser Vault (chrome.storage.local & IndexedDB sandbox)
 * 4. Audit & Event Logger
 * 5. Multi-lingual Directives Console (Hindi Indian & English Voice STT)
 * 6. Dynamic Assistant Name Customization (Custom name instead of bot)
 * 7. Real-Time Gemini API Key Input with Expiry Alert & Validation
 * 8. Configurable Backend URL for Cloud Deployment (Render, Railway, Cloud Run)
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Configurable URLs and State
  let BACKEND_URL = localStorage.getItem('securevision_backend_url') || 'http://127.0.0.1:8000';
  let assistantName = localStorage.getItem('securevision_assistant_name') || 'SecureVision AI';
  let activeGeminiApiKey = '';

  // Apply full tab expansion if in wide window or tab query
  if (window.innerWidth > 805 || window.location.search.includes('tab=1')) {
    document.documentElement.classList.add('full-tab');
    document.body.classList.add('full-tab');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────────────────────────────────
  let isMuted = true;
  let isSpeaking = false;
  let isListening = false;
  let voiceConversationalMode = true;
  let selectedLanguage = localStorage.getItem('jarvis_selected_lang') || 'hi-IN';
  let backendOnline = false;

  // Screen Shield State
  let currentShieldActive = false;
  let currentShieldMode = 'blur';
  let cachedVaultRecords = [];
  let currentDetections = {
    cards: 0,
    passwords: 0,
    emails: 0,
    phones: 0,
    ssn: 0,
    faces: 0
  };

  // Helper to send messages safely to active Chrome tab
  async function sendActiveTabMessage(message) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          return await chrome.tabs.sendMessage(tab.id, message);
        }
      } catch (_) {}
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Tab Navigation
  // ──────────────────────────────────────────────────────────────────────────
  function initTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    const openSettingsBtn = document.getElementById('btn-open-settings');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => switchTab('settings'));
    }

    const fixKeyBtn = document.getElementById('btn-fix-api-key');
    if (fixKeyBtn) {
      fixKeyBtn.addEventListener('click', () => {
        switchTab('settings');
        const keyInput = document.getElementById('input-gemini-key');
        if (keyInput) keyInput.focus();
      });
    }
  }

  function switchTab(targetTab) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const targetContent = document.getElementById(`tab-${targetTab}`);
    if (targetContent) targetContent.classList.add('active');

    if (targetTab === 'local-vault') {
      renderVaultRecords();
    } else if (targetTab === 'settings') {
      syncSettingsUI();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Screen Privacy Guard & Shield Controls
  // ──────────────────────────────────────────────────────────────────────────
  function initScreenPrivacyGuard() {
    const masterToggle = document.getElementById('master-shield-toggle');
    const shieldStatusBadge = document.getElementById('shield-status-badge');
    const statusTextLabel = document.getElementById('status-text-label');
    const liveLeakBadge = document.getElementById('live-leak-badge');
    const scanFeedbackText = document.getElementById('scan-feedback-text');
    const scanNowBtn = document.getElementById('scan-now-btn');
    const saveVaultBtn = document.getElementById('save-vault-btn');
    const modeChips = document.querySelectorAll('.chip[data-mode]');
    const vaultCountBadge = document.getElementById('vault-count-badge');

    // Load initial shield settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['screen_shield_enabled', 'screen_shield_style', 'screen_vault_records', 'privacy_vault_records'], async (res) => {
        if (res) {
          if (res.screen_shield_enabled !== undefined) {
            currentShieldActive = !!res.screen_shield_enabled;
          }
          if (res.screen_shield_style) {
            currentShieldMode = res.screen_shield_style;
          }
          const recs1 = Array.isArray(res.screen_vault_records) ? res.screen_vault_records : [];
          const recs2 = Array.isArray(res.privacy_vault_records) ? res.privacy_vault_records : [];
          cachedVaultRecords = mergeVaultRecords(recs1, recs2);
          updateVaultCountBadge();
        }
        applyShieldStateToUI(currentShieldActive);
        applyShieldModeToUI(currentShieldMode);
      });
    }

    function applyShieldStateToUI(active) {
      currentShieldActive = active;
      if (masterToggle) masterToggle.checked = active;

      if (active) {
        if (shieldStatusBadge) shieldStatusBadge.className = 'privacy-status-badge active';
        if (statusTextLabel) statusTextLabel.textContent = 'Shield Active';
        if (liveLeakBadge) {
          liveLeakBadge.textContent = 'ZERO LEAK ACTIVE ✓';
          liveLeakBadge.className = 'shield-badge-pill active';
        }
        if (scanFeedbackText) {
          scanFeedbackText.textContent = 'PROTECTION LIVE';
          scanFeedbackText.className = 'live-status-dot active';
        }
      } else {
        if (shieldStatusBadge) shieldStatusBadge.className = 'privacy-status-badge paused';
        if (statusTextLabel) statusTextLabel.textContent = 'Shield Paused';
        if (liveLeakBadge) {
          liveLeakBadge.textContent = 'SHIELD OFF ⚠️';
          liveLeakBadge.className = 'shield-badge-pill';
        }
        if (scanFeedbackText) {
          scanFeedbackText.textContent = 'PROTECTION PAUSED';
          scanFeedbackText.className = 'live-status-dot paused';
        }
      }
    }

    function applyShieldModeToUI(mode) {
      currentShieldMode = mode;
      modeChips.forEach(chip => {
        if (chip.getAttribute('data-mode') === mode) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }

    if (masterToggle) {
      masterToggle.addEventListener('change', async (e) => {
        const active = e.target.checked;
        applyShieldStateToUI(active);

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'SET_GLOBAL_SHIELD',
            active: active
          });
        }
        await sendActiveTabMessage({
          type: 'TOGGLE_SCREEN_SHIELD',
          active: active
        });

        addAuditLog(active ? 'Shield Protection Enabled' : 'Shield Protection Paused', active ? 'shield' : 'info');
      });
    }

    modeChips.forEach(chip => {
      chip.addEventListener('click', async () => {
        const mode = chip.getAttribute('data-mode');
        if (!mode) return;
        applyShieldModeToUI(mode);

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ screen_shield_style: mode });
        }
        await sendActiveTabMessage({
          type: 'SET_SHIELD_STYLE',
          style: mode
        });
        addAuditLog(`Screen masking technique changed to: ${mode.toUpperCase()}`, 'info');
      });
    });

    if (scanNowBtn) {
      scanNowBtn.addEventListener('click', async () => {
        scanNowBtn.disabled = true;
        scanNowBtn.textContent = 'Scanning Screen...';
        addAuditLog('Initiated full page privacy & PII scan', 'info');

        try {
          const resp = await sendActiveTabMessage({ type: 'SCAN_PAGE_SENSITIVE_DATA' });
          if (resp && resp.detections) {
            updateMetricsDisplay(resp.detections);
            addAuditLog(`Scan completed: ${resp.totalCount || 0} sensitive items detected.`, 'shield');
          } else {
            addAuditLog('Scan completed: 0 sensitive items detected on viewport.', 'info');
          }
        } catch (err) {
          console.debug('Scan note:', err);
        } finally {
          scanNowBtn.disabled = false;
          scanNowBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Scan &amp; Shield Screen
          `;
        }
      });
    }

    if (saveVaultBtn) {
      saveVaultBtn.addEventListener('click', async () => {
        saveVaultBtn.disabled = true;
        saveVaultBtn.textContent = 'Saving to Vault...';

        try {
          const resp = await sendActiveTabMessage({ type: 'SAVE_TO_LOCAL_VAULT' });
          if (resp && resp.savedCount !== undefined) {
            addAuditLog(`Saved ${resp.savedCount} sensitive records to local sandbox vault.`, 'shield');
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              const res = await chrome.storage.local.get(['screen_vault_records', 'privacy_vault_records']);
              const recs1 = Array.isArray(res.screen_vault_records) ? res.screen_vault_records : [];
              const recs2 = Array.isArray(res.privacy_vault_records) ? res.privacy_vault_records : [];
              cachedVaultRecords = mergeVaultRecords(recs1, recs2);
              updateVaultCountBadge();
              renderVaultRecords();
            }
          }
        } catch (_) {}
        finally {
          saveVaultBtn.disabled = false;
          saveVaultBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
            </svg>
            Save to Vault
          `;
        }
      });
    }
  }

  function updateMetricsDisplay(counts) {
    if (!counts) return;
    currentDetections = { ...currentDetections, ...counts };

    const map = {
      'stat-cards': currentDetections.cards || 0,
      'stat-passwords': currentDetections.passwords || 0,
      'stat-emails': currentDetections.emails || 0,
      'stat-phones': currentDetections.phones || 0,
      'stat-ssn': currentDetections.ssn || 0,
      'stat-faces': currentDetections.faces || 0
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  function mergeVaultRecords(arr1, arr2) {
    const map = new Map();
    [...arr1, ...arr2].forEach(r => {
      if (r && (r.id || r.token)) {
        const key = r.id || `${r.domain || ''}_${r.category || ''}_${r.token || ''}`;
        if (!map.has(key)) map.set(key, r);
      }
    });
    return Array.from(map.values());
  }

  function updateVaultCountBadge() {
    const badge = document.getElementById('vault-count-badge');
    if (badge) badge.textContent = cachedVaultRecords.length;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Local Vault Controls
  // ──────────────────────────────────────────────────────────────────────────
  function initVaultAndAuditControls() {
    const exportBtn = document.getElementById('export-vault-btn');
    const clearBtn = document.getElementById('clear-vault-btn');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const searchInput = document.getElementById('vault-search-input');
    const filterSelect = document.getElementById('vault-category-filter');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!cachedVaultRecords.length) {
          alert('Local vault is currently empty.');
          return;
        }
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cachedVaultRecords, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `securevision_vault_${Date.now()}.json`;
        a.click();
        addAuditLog('Exported local sandbox vault records to JSON', 'info');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all secured records in this browser?')) {
          cachedVaultRecords = [];
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.remove(['screen_vault_records', 'privacy_vault_records']);
          }
          if (window.PrivacyShieldDB && window.PrivacyShieldDB.clearVault) {
            await window.PrivacyShieldDB.clearVault().catch(() => {});
          }
          updateVaultCountBadge();
          renderVaultRecords();
          addAuditLog('Cleared all local vault records', 'info');
        }
      });
    }

    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        const feed = document.getElementById('log-feed');
        if (feed) feed.innerHTML = '<div class="log-item info">Security log cleared. Zero external leak mode active.</div>';
      });
    }

    if (searchInput) searchInput.addEventListener('input', renderVaultRecords);
    if (filterSelect) filterSelect.addEventListener('change', renderVaultRecords);
  }

  function renderVaultRecords() {
    const container = document.getElementById('vault-records-list');
    const emptyState = document.getElementById('vault-empty-state');
    const searchInput = document.getElementById('vault-search-input');
    const filterSelect = document.getElementById('vault-category-filter');

    if (!container) return;

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const cat = filterSelect ? filterSelect.value : 'all';

    let filtered = cachedVaultRecords.filter(r => {
      if (cat !== 'all' && (r.category || '').toLowerCase() !== cat) return false;
      if (query) {
        const text = `${r.domain || ''} ${r.category || ''} ${r.masked || ''} ${r.token || ''}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    container.innerHTML = '';
    if (!filtered.length) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(record => {
      const item = document.createElement('div');
      item.className = 'vault-item-card';
      item.innerHTML = `
        <div class="vault-item-top">
          <span class="vault-badge ${record.category || 'card'}">${(record.category || 'DATA').toUpperCase()}</span>
          <span class="vault-domain">${escapeHtml(record.domain || 'Active Tab')}</span>
          <span class="vault-time">${formatTime(record.timestamp)}</span>
        </div>
        <div class="vault-item-body">
          <code class="vault-masked">${escapeHtml(record.masked || record.token || '••••••••')}</code>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function addAuditLog(msg, type = 'info') {
    const feed = document.getElementById('log-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = `[${new Date().toTimeString().split(' ')[0]}] ${msg}`;
    feed.prepend(item);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Language & Voice Mode
  // ──────────────────────────────────────────────────────────────────────────
  function initLanguageAndVoiceMode() {
    const langSelect = document.getElementById('jarvis-lang-select');
    const voiceModeBtn = document.getElementById('btn-voice-conversational');
    const voiceModeLabel = document.getElementById('voice-mode-label');

    if (langSelect) {
      langSelect.value = selectedLanguage;
      langSelect.addEventListener('change', (e) => {
        selectedLanguage = e.target.value;
        localStorage.setItem('jarvis_selected_lang', selectedLanguage);
        logActivity('SYS', `Directive language set to: ${selectedLanguage === 'hi-IN' ? 'Hindi हिन्दी' : 'English'}`);
      });
    }

    if (voiceModeBtn) {
      voiceModeBtn.addEventListener('click', () => {
        voiceConversationalMode = !voiceConversationalMode;
        if (voiceConversationalMode) {
          voiceModeBtn.classList.add('active');
          if (voiceModeLabel) voiceModeLabel.textContent = 'VOICE CHAT: AUTO';
        } else {
          voiceModeBtn.classList.remove('active');
          if (voiceModeLabel) voiceModeLabel.textContent = 'VOICE CHAT: MANUAL';
        }
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Settings Tab & Dynamic Configuration (API Key, Name, Backend URL)
  // ──────────────────────────────────────────────────────────────────────────
  function initSettings() {
    const keyInput = document.getElementById('input-gemini-key');
    const toggleEyeBtn = document.getElementById('toggle-key-visibility-btn');
    const saveKeyBtn = document.getElementById('btn-save-api-key');
    const keyFeedback = document.getElementById('key-validation-feedback');
    const keyBadge = document.getElementById('key-status-badge');

    const nameInput = document.getElementById('input-assistant-name');
    const saveNameBtn = document.getElementById('btn-save-assistant-name');
    const nameFeedback = document.getElementById('name-save-feedback');
    const nameDisplay = document.getElementById('current-name-display');

    const urlInput = document.getElementById('input-backend-url');
    const saveUrlBtn = document.getElementById('btn-save-backend-url');
    const urlFeedback = document.getElementById('server-connection-feedback');
    const urlStatus = document.getElementById('server-status-display');

    // 1. Password Visibility Toggle
    if (toggleEyeBtn && keyInput) {
      toggleEyeBtn.addEventListener('click', () => {
        if (keyInput.type === 'password') {
          keyInput.type = 'text';
          toggleEyeBtn.textContent = '🙈';
        } else {
          keyInput.type = 'password';
          toggleEyeBtn.textContent = '👁️';
        }
      });
    }

    // 2. Save & Validate API Key
    if (saveKeyBtn && keyInput) {
      saveKeyBtn.addEventListener('click', async () => {
        const key = keyInput.value.trim();
        if (!key) {
          showFeedback(keyFeedback, 'Please paste your Google Gemini API key.', 'error');
          return;
        }

        // Google Gemini API keys start with "AIza" or "AQ."
        if (!key.startsWith('AIza') && !key.startsWith('AQ.') && key.length < 25) {
          showFeedback(
            keyFeedback,
            `❌ Format galat hai: Google Gemini API key 'AIzaSy...' ya 'AQ.Ab...' se start hoti hai. Aapne "${key.substring(0, 5)}..." enter ki hai jo Gemini key nahi hai. Kripya aistudio.google.com se sahi API Key copy karein.`,
            'error'
          );
          if (keyBadge) {
            keyBadge.textContent = 'Wrong Format';
            keyBadge.className = 'settings-badge';
          }
          return;
        }

        saveKeyBtn.disabled = true;
        showFeedback(keyFeedback, 'Validating key with Google Gemini API...', 'loading');

        try {
          const res = await fetch(`${BACKEND_URL}/api/config/key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key, validate_immediately: true })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            activeGeminiApiKey = key;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              await chrome.storage.local.set({ jarvis_gemini_api_key: key });
            }
            showFeedback(keyFeedback, '✓ Gemini API Key successfully verified and connected!', 'success');
            if (keyBadge) {
              keyBadge.textContent = 'Connected ✓';
              keyBadge.className = 'settings-badge connected';
            }
            hideKeyAlertBanner();
            logActivity('SYS', `Gemini API Key active. ${assistantName} ready.`);
          } else {
            const err = data.error || 'Google ne API Key reject kar di.';
            showFeedback(keyFeedback, `❌ ${err}`, 'error');
            if (keyBadge) {
              keyBadge.textContent = 'Invalid Key';
              keyBadge.className = 'settings-badge';
            }
          }
        } catch (err) {
          // If backend offline, save locally
          activeGeminiApiKey = key;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ jarvis_gemini_api_key: key });
          }
          showFeedback(keyFeedback, 'Saved key locally in browser sandbox (backend offline).', 'success');
          hideKeyAlertBanner();
        } finally {
          saveKeyBtn.disabled = false;
        }
      });
    }

    // 3. Save Assistant Name
    if (saveNameBtn && nameInput) {
      saveNameBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        if (!name) {
          showFeedback(nameFeedback, 'Assistant name cannot be empty.', 'error');
          return;
        }

        assistantName = name;
        localStorage.setItem('securevision_assistant_name', name);
        if (nameDisplay) nameDisplay.textContent = name;
        updateAssistantNameInUI(name);

        try {
          await fetch(`${BACKEND_URL}/api/config/name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assistant_name: name })
          });
        } catch (_) {}

        showFeedback(nameFeedback, `✓ Assistant name updated to '${name}'!`, 'success');
        logActivity('SYS', `Assistant identity updated to: ${name}`);
      });
    }

    // 4. Connect Backend Server URL
    if (saveUrlBtn && urlInput) {
      saveUrlBtn.addEventListener('click', async () => {
        let url = urlInput.value.trim().replace(/\/+$/, '');
        if (!url) url = 'http://127.0.0.1:8000';

        BACKEND_URL = url;
        localStorage.setItem('securevision_backend_url', url);
        saveUrlBtn.disabled = true;
        showFeedback(urlFeedback, `Connecting to ${url}...`, 'loading');

        try {
          const res = await fetch(`${BACKEND_URL}/health`);
          if (res.ok) {
            const data = await res.json();
            backendOnline = true;
            showFeedback(urlFeedback, `✓ Connected to backend successfully (${data.service || 'Ready'})!`, 'success');
            if (urlStatus) {
              urlStatus.textContent = 'Online ✓';
              urlStatus.className = 'server-status-tag';
            }
            if (data.assistant_name && !localStorage.getItem('securevision_assistant_name')) {
              assistantName = data.assistant_name;
              updateAssistantNameInUI(data.assistant_name);
            }
          } else {
            throw new Error(`Status ${res.status}`);
          }
        } catch (err) {
          backendOnline = false;
          showFeedback(urlFeedback, `Could not reach ${url}. Check server or CORS.`, 'error');
          if (urlStatus) {
            urlStatus.textContent = 'Offline';
            urlStatus.className = 'server-status-tag';
          }
        } finally {
          saveUrlBtn.disabled = false;
        }
      });
    }

    // Load initial stored values
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['jarvis_gemini_api_key'], (res) => {
        if (res && res.jarvis_gemini_api_key) {
          activeGeminiApiKey = res.jarvis_gemini_api_key;
          if (keyInput) keyInput.value = activeGeminiApiKey;
          if (keyBadge) {
            keyBadge.textContent = 'Key Stored';
            keyBadge.className = 'settings-badge connected';
          }
        } else {
          showKeyAlertBanner('Gemini API Key missing! Click here to configure.');
        }
      });
    }

    if (nameInput) nameInput.value = assistantName;
    if (nameDisplay) nameDisplay.textContent = assistantName;
    if (urlInput) urlInput.value = BACKEND_URL;
    updateAssistantNameInUI(assistantName);
  }

  function showFeedback(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = `validation-feedback ${type}`;
  }

  function showKeyAlertBanner(msg) {
    const banner = document.getElementById('api-key-alert-banner');
    const text = document.getElementById('api-key-alert-text');
    if (banner) banner.classList.remove('hidden');
    if (text) text.textContent = msg;
  }

  function hideKeyAlertBanner() {
    const banner = document.getElementById('api-key-alert-banner');
    if (banner) banner.classList.add('hidden');
  }

  function updateAssistantNameInUI(name) {
    const greeting = document.getElementById('initial-ai-greeting');
    if (greeting) {
      greeting.textContent = `${name}: System ready. Send any query or screen directive in Hindi or English.`;
    }
    const input = document.getElementById('command-input-field');
    if (input) {
      input.placeholder = `Directive for ${name} in Hindi or English…`;
    }
  }

  async function syncSettingsUI() {
    const keyBadge = document.getElementById('key-status-badge');
    const urlStatus = document.getElementById('server-status-display');

    try {
      const res = await fetch(`${BACKEND_URL}/api/config`);
      if (res.ok) {
        const data = await res.json();
        if (urlStatus) {
          urlStatus.textContent = 'Online ✓';
          urlStatus.className = 'server-status-tag';
        }
        if (keyBadge) {
          if (data.has_api_key) {
            keyBadge.textContent = `Connected (${data.api_key_masked || 'Active'})`;
            keyBadge.className = 'settings-badge connected';
            hideKeyAlertBanner();
          } else if (!activeGeminiApiKey) {
            keyBadge.textContent = 'Not Configured';
            keyBadge.className = 'settings-badge';
          }
        }
      }
    } catch (_) {
      if (urlStatus) {
        urlStatus.textContent = 'Offline';
        urlStatus.className = 'server-status-tag';
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Directives Console Execution (AI without Bot)
  // ──────────────────────────────────────────────────────────────────────────
  function initCommandInput() {
    const input = document.getElementById('command-input-field');
    const sendBtn = document.getElementById('btn-send-command');
    const chips = document.querySelectorAll('.d-chip');

    async function runDirective(text) {
      if (!text || !text.trim()) return;
      const directive = text.trim();
      if (input) input.value = '';

      logActivity('USER', directive);

      // Active tab context
      let pageTitle = '', pageUrl = '';
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            pageTitle = tab.title || '';
            pageUrl = tab.url || '';
          }
        } catch (_) {}
      }

      try {
        const res = await fetch(`${BACKEND_URL}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: directive,
            page_title: pageTitle,
            page_url: pageUrl,
            api_key: activeGeminiApiKey || undefined,
            language: selectedLanguage,
          })
        });

        if (res.ok) {
          const data = await res.json();

          // Check if key expired or missing
          if (data.error_type === 'API_KEY_EXPIRED' || data.error_type === 'MISSING_KEY') {
            showKeyAlertBanner('⚠️ Gemini API Key expired or invalid! Click here to update.');
            logActivity(assistantName, data.response || 'Gemini API Key expired ya invalid hai. Please Settings tab me check karein.');
            return;
          }

          hideKeyAlertBanner();
          if (data.thought) {
            logActivity('🧠 BRAIN', `[Thinking]: ${data.thought}`);
          }
          const reply = data.response || 'Directive executed.';
          logActivity(assistantName, reply);
          speakReply(reply);
        } else {
          logActivity(assistantName, 'Could not complete directive. Check backend status or API key in Settings.');
        }
      } catch (err) {
        logActivity(assistantName, `Acknowledged: "${directive}". Backend connection note: ${err.message}`);
      }
    }

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => runDirective(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runDirective(input.value);
      });
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) runDirective(cmd);
      });
    });
  }

  // Activity Log
  let lastLoggedMessage = '';
  function logActivity(sender, text) {
    const feed = document.getElementById('activity-log-feed');
    if (!feed) return;
    const msgKey = `${sender}:${text}`;
    if (msgKey === lastLoggedMessage) return;
    lastLoggedMessage = msgKey;
    const row = document.createElement('div');
    row.className = `log-row ${sender.toLowerCase().replace(/[^a-z]/g, '')}`;
    row.textContent = `${sender}: ${text}`;
    feed.appendChild(row);
    feed.scrollTop = feed.scrollHeight;
  }

  function initLogClear() {
    const btn = document.getElementById('btn-clear-activity');
    const feed = document.getElementById('activity-log-feed');
    if (btn && feed) {
      btn.addEventListener('click', () => {
        feed.innerHTML = '<div class="log-row sys">SYS: Activity feed cleared.</div>';
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Voice STT & Clean Speech Output
  // ──────────────────────────────────────────────────────────────────────────
  let recognition = null;
  function initMuteAndMic() {
    const micToggle = document.getElementById('btn-mic-toggle');
    const micInputBtn = document.getElementById('btn-voice-input-mic');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        isListening = true;
        if (micInputBtn) micInputBtn.classList.add('active');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const input = document.getElementById('command-input-field');
          if (input) input.value = transcript;
          const sendBtn = document.getElementById('btn-send-command');
          if (sendBtn) sendBtn.click();
        }
      };

      recognition.onend = () => {
        isListening = false;
        if (micInputBtn) micInputBtn.classList.remove('active');
      };

      recognition.onerror = () => {
        isListening = false;
        if (micInputBtn) micInputBtn.classList.remove('active');
      };
    }

    if (micInputBtn) {
      micInputBtn.addEventListener('click', () => {
        if (!recognition) {
          alert('Speech Recognition is not supported in this browser window.');
          return;
        }
        if (isListening) {
          recognition.stop();
        } else {
          recognition.lang = selectedLanguage;
          try { recognition.start(); } catch (_) {}
        }
      });
    }

    if (micToggle) {
      micToggle.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
          micToggle.className = 'action-btn-mic muted';
          micToggle.textContent = '🎤  MICROPHONE MUTED';
          window.speechSynthesis.cancel();
        } else {
          micToggle.className = 'action-btn-mic active';
          micToggle.textContent = '🔊  AUDIO ACTIVE';
        }
      });
    }
  }

  let activeAudioElement = null;

  function onSpeechEnded() {
    isSpeaking = false;
    activeAudioElement = null;
    // Continuous hands-free conversation: if voiceConversationalMode is ON, resume mic automatically
    if (voiceConversationalMode && recognition && !isListening && !isMuted) {
      setTimeout(() => {
        try {
          recognition.lang = selectedLanguage || 'hi-IN';
          recognition.start();
        } catch (_) {}
      }, 500);
    }
  }

  function fallbackBrowserSpeak(cleanText) {
    if (!('speechSynthesis' in window)) {
      onSpeechEnded();
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedLanguage || 'hi-IN';
    utterance.rate = 1.0;
    utterance.pitch = 0.88; // Deep Boy/Male JARVIS tone

    // Prefer Male voice (hi-IN-MadhurNeural, Rishi, David, George, Guy)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      (v.lang.startsWith('hi') || v.lang.includes('IN')) && 
      (v.name.includes('Madhur') || v.name.includes('Male') || v.name.includes('Rishi') || v.name.includes('Hemant'))
    ) || voices.find(v => 
      v.lang.startsWith('hi') || v.lang.includes('IN') || v.name.includes('हिन्दी')
    ) || voices.find(v => 
      v.name.includes('David') || v.name.includes('George') || v.name.includes('Guy') || v.name.includes('Ryan')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { onSpeechEnded(); };
    utterance.onerror = () => { onSpeechEnded(); };

    window.speechSynthesis.speak(utterance);
  }

  async function speakReply(text) {
    if (isMuted || !text) return;

    // Interrupt any currently playing audio or browser speech
    if (activeAudioElement) {
      try { activeAudioElement.pause(); activeAudioElement = null; } catch (_) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Clean text of markdown, bullet points and technical syntax for natural speech
    const clean = text
      .replace(/[*#`_~\[\]\(\)]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/[-+•]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    // 1. Try Backend High-Quality JARVIS Boy/Male Voice (EdgeTTS hi-IN-MadhurNeural)
    try {
      const targetLang = (selectedLanguage && selectedLanguage.startsWith('hi')) ? 'hi' : 'en';
      const maleVoice = targetLang === 'hi' ? 'hi-IN-MadhurNeural' : 'en-US-GuyNeural';
      const ttsUrl = `${BACKEND_URL}/api/tts?text=${encodeURIComponent(clean)}&lang=${targetLang}&voice=${maleVoice}`;
      const audio = new Audio(ttsUrl);
      activeAudioElement = audio;
      isSpeaking = true;

      audio.onended = () => {
        onSpeechEnded();
      };

      audio.onerror = () => {
        // Fallback to browser's SpeechSynthesis engine if backend audio stream fails
        fallbackBrowserSpeak(clean);
      };

      await audio.play();
    } catch (_) {
      fallbackBrowserSpeak(clean);
    }
  }

  function initInterrupt() {
    const btn = document.getElementById('btn-interrupt');
    function interrupt() {
      if (activeAudioElement) {
        try { activeAudioElement.pause(); activeAudioElement = null; } catch (_) {}
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (recognition && isListening) recognition.stop();
      fetch(`${BACKEND_URL}/interrupt`, { method: 'POST' }).catch(() => {});
      logActivity('SYS', 'Interrupted.');
    }

    if (btn) btn.addEventListener('click', interrupt);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') interrupt();
      if (e.key === 'F4') {
        const micToggle = document.getElementById('btn-mic-toggle');
        if (micToggle) micToggle.click();
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Fullscreen / Expand to Full Tab [F11]
  // ──────────────────────────────────────────────────────────────────────────
  function initFullscreen() {
    const btn = document.getElementById('btn-fullscreen-toggle');
    const footerBtn = document.getElementById('footer-fullscreen-btn');

    function openFull() {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tab=1') });
      } else {
        window.open('popup.html?tab=1', '_blank');
      }
    }

    if (btn) btn.addEventListener('click', openFull);
    if (footerBtn) footerBtn.addEventListener('click', openFull);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function formatTime(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Bootstrap
  // ──────────────────────────────────────────────────────────────────────────
  initTabNavigation();
  initScreenPrivacyGuard();
  initVaultAndAuditControls();
  initLanguageAndVoiceMode();
  initSettings();
  initCommandInput();
  initLogClear();
  initMuteAndMic();
  initInterrupt();
  initFullscreen();
});
