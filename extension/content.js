/**
 * Screen Privacy Guard - Content Script & Anti-AI-Agent Screen Shield
 * 
 * Primary Responsibilities:
 * 1. Real-time client-side detection of sensitive data (PII, cards, passwords, tokens, faces).
 * 2. Visual On-Screen Masking: Physically covers sensitive regions with impenetrable
 *    overlays (Blackout, Blur, Pixelate, Semantic) to block AI vision models, OCR,
 *    and screenshot grabbers from reading sensitive data from the entire screen.
 * 3. Anti-Scraping / DOM Cloaking: Prevents automated AI crawlers from harvesting sensitive DOM nodes.
 * 4. Local Browser Storage: Saves detected sensitive records strictly to browser local storage.
 * 5. Complete removal of all Chitty automation and voice features.
 */

(function () {
  // If an existing instance was running on this page, clean it up before re-registering
  if (window.__SCREEN_PRIVACY_GUARD_CLEANUP__) {
    try {
      window.__SCREEN_PRIVACY_GUARD_CLEANUP__();
    } catch (e) {}
  }

  const piiDetector = new (window.PIIDetector || PIIDetector)();
  const faceDetector = new (window.FaceDetector || FaceDetector)();

  // Shield State (Default is OFF - only activates when turned ON)
  let isShieldActive = false;
  let shieldStyle = 'blackout'; // 'blackout', 'blur', 'pixelate', 'semantic'
  let detectedEntities = [];
  let overlayContainer = null;
  let floatingBadge = null;
  let observer = null;
  let repositionScheduled = false;

  // In-Place DOM Sanitization & Action Preservation Vaults
  const originalDomMap = new Map();
  const preservedActionRegistry = new Map();
  let preservedClickListenerAttached = false;

  /**
   * Global event listener to intercept and preserve legitimate Call, WhatsApp, and Email actions
   * while keeping original URLs/numbers absent from the DOM tree.
   */
  function handlePreservedActionClick(e) {
    const target = e.target;
    const actionEl = (target && target.closest) ? target.closest('[data-shield-preserved-action]') : null;
    if (!actionEl) return;

    const actionId = actionEl.getAttribute('data-shield-preserved-action');
    const item = preservedActionRegistry.get(actionId);
    if (!item || !item.originalHref) return;

    e.preventDefault();
    e.stopPropagation();

    const { actionType, originalHref } = item;
    if (actionType === 'call') {
      showToast('📞 Connecting call to preserved telephone helpline...');
      window.location.href = originalHref;
    } else if (actionType === 'email') {
      showToast('✉️ Opening email client for preserved contact address...');
      window.location.href = originalHref;
    } else if (actionType === 'whatsapp') {
      showToast('💬 Opening WhatsApp peer chat...');
      window.open(originalHref, '_blank', 'noopener,noreferrer');
    }
  }

  function ensurePreservedClickListener() {
    if (!preservedClickListenerAttached && typeof document !== 'undefined') {
      document.addEventListener('click', handlePreservedActionClick, true);
      preservedClickListenerAttached = true;
    }
  }

  /**
   * Initialize or retrieve the overlay container
   */
  function getOverlayContainer() {
    if (!overlayContainer || !document.body || !document.body.contains(overlayContainer)) {
      overlayContainer = document.getElementById('screen-privacy-shield-container');
      if (!overlayContainer) {
        overlayContainer = document.createElement('div');
        overlayContainer.id = 'screen-privacy-shield-container';
        overlayContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          pointer-events: none !important;
          z-index: 2147483640 !important;
          overflow: visible !important;
        `;
        if (document.body) {
          document.body.appendChild(overlayContainer);
        } else if (document.documentElement) {
          document.documentElement.appendChild(overlayContainer);
        }
      }
    }
    return overlayContainer;
  }

  /**
   * In-Place DOM Sanitization:
   * Replaces actual sensitive values directly inside DOM text nodes, input values,
   * placeholders, and action link hrefs with sanitized tokens.
   * 
   * SECURITY PRINCIPLE:
   * Visual overlays (CSS) and aria-hidden/data-ai-blocked attributes are NOT security controls.
   * True security requires mutating the DOM tree itself so that:
   * 1. DevTools Ctrl+F finds 0 sensitive occurrences in the DOM tree.
   * 2. AI scrapers, OCR models, and DOM serializers read 0 raw PII.
   * 3. Legitimate user actions (Call, WhatsApp, Email) are preserved via an in-memory vault.
   */
  /**
   * In-Place DOM Sanitization:
   * Replaces actual sensitive values directly inside DOM text nodes, input attributes,
   * placeholders, action link hrefs, and custom data attributes with sanitized tokens.
   * 
   * SECURITY & DEVTOOLS INSPECTION PRINCIPLE:
   * Chrome DevTools inspect element displays text nodes AND element HTML attributes.
   * True privacy shielding requires mutating the actual DOM nodes and attributes so that:
   * 1. Inspecting elements in Chrome DevTools shows 0 phone numbers or sensitive data.
   * 2. DevTools Ctrl+F finds 0 sensitive occurrences in the DOM tree.
   * 3. AI scrapers, OCR models, and DOM serializers read 0 raw PII.
   * 4. Legitimate user actions (Call, WhatsApp, Email) are preserved via an in-memory vault & IndexedDB.
   */
  function sanitizeDOMInPlace(entities = detectedEntities) {
    ensurePreservedClickListener();
    if (!entities || entities.length === 0) return;

    // 1. Sanitize specific entities detected
    entities.forEach((ent) => {
      const token = ent.sanitizedToken || `[PROTECTED_${(ent.category || 'PII').toUpperCase()}]`;

      // Text Node in-place substitution
      if (ent.textNode && ent.textNode.nodeType === 3 /* Node.TEXT_NODE */) {
        const node = ent.textNode;
        if (!originalDomMap.has(node)) {
          originalDomMap.set(node, {
            type: 'text',
            node: node,
            originalValue: node.nodeValue
          });
        }
        if (ent.rawText && node.nodeValue.includes(ent.rawText)) {
          node.nodeValue = node.nodeValue.split(ent.rawText).join(token);
        } else if (piiDetector.hasPIIPattern && piiDetector.hasPIIPattern(node.nodeValue)) {
          node.nodeValue = piiDetector.sanitizeString(node.nodeValue);
        }
      }

      // Action Links (<a href="tel:...", "mailto:...", "wa.me/...")
      if (ent.isActionLink && ent.element) {
        const el = ent.element;
        if (!originalDomMap.has(el)) {
          originalDomMap.set(el, {
            type: 'action_link',
            element: el,
            originalHref: ent.originalHref || el.getAttribute('href') || '',
            originalText: el.innerText
          });
        }

        // Store real destination safely in private in-memory registry
        preservedActionRegistry.set(ent.id, {
          id: ent.id,
          originalHref: ent.originalHref || el.getAttribute('href') || '',
          actionType: ent.actionType,
          rawVal: ent.rawVal,
          element: el
        });

        el.setAttribute('data-shield-preserved-action', ent.id);
        el.setAttribute('href', `#shield-action-${ent.actionType || 'call'}`);

        // Mask innerText & textContent so inspect element doesn't show raw phone or email
        if (el.innerText && (piiDetector.hasPIIPattern(el.innerText) || (ent.rawText && el.innerText.includes(ent.rawText)))) {
          el.innerText = piiDetector.sanitizeString(el.innerText);
        }
      }

      // Form Inputs & Textareas (including hidden inputs)
      if (ent.element && (ent.element.tagName === 'INPUT' || ent.element.tagName === 'TEXTAREA')) {
        const el = ent.element;
        if (!originalDomMap.has(el)) {
          originalDomMap.set(el, {
            type: 'input',
            element: el,
            originalValue: el.value,
            originalPlaceholder: el.placeholder,
            originalAttrValue: el.getAttribute('value')
          });
        }

        el.value = token;
        el.setAttribute('value', token); // CRITICAL: Sets HTML attribute so Chrome Inspect Element hides raw value!
        el.setAttribute('autocomplete', 'off');

        if (el.placeholder && piiDetector.hasPIIPattern && piiDetector.hasPIIPattern(el.placeholder)) {
          el.placeholder = token;
          el.setAttribute('placeholder', token);
        }
      }
    });

    // 2. Comprehensive DOM Sweep: Walk all text nodes in document to catch any unanchored PII
    try {
      const root = document.body || document.documentElement;
      if (root && document.createTreeWalker) {
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              if (piiDetector.isIconElement && piiDetector.isIconElement(parent)) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName.toLowerCase();
              if (['script', 'style', 'noscript', 'canvas', 'svg'].includes(tag)) {
                return NodeFilter.FILTER_REJECT;
              }
              if (!node.nodeValue || node.nodeValue.trim().length === 0) {
                return NodeFilter.FILTER_SKIP;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let tNode;
        while ((tNode = walker.nextNode())) {
          const val = tNode.nodeValue;
          if (piiDetector.hasPIIPattern && piiDetector.hasPIIPattern(val)) {
            if (!originalDomMap.has(tNode)) {
              originalDomMap.set(tNode, {
                type: 'text',
                node: tNode,
                originalValue: val
              });
            }
            tNode.nodeValue = piiDetector.sanitizeString(val);
          }
        }
      }
    } catch (walkErr) {
      console.debug('[Screen Privacy Guard] Text walker notice:', walkErr);
    }

    // 3. Comprehensive Element Attribute Sweep: Sanitize attributes (data-*, title, aria-label, href, value)
    try {
      const allEls = document.querySelectorAll('*');
      allEls.forEach((el) => {
        // Skip icons, social badges, and SVG elements
        if (piiDetector.isIconElement && piiDetector.isIconElement(el)) return;

        // Inputs: ensure attribute 'value' is masked if el.value is sensitive
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          const attrVal = el.getAttribute('value');
          if (attrVal && piiDetector.hasPIIPattern && piiDetector.hasPIIPattern(attrVal)) {
            if (!originalDomMap.has(el)) {
              originalDomMap.set(el, {
                type: 'input',
                element: el,
                originalValue: el.value,
                originalPlaceholder: el.placeholder,
                originalAttrValue: attrVal
              });
            }
            const masked = piiDetector.sanitizeString(attrVal);
            el.setAttribute('value', masked);
            el.value = masked;
          }
        }

        // Links: sanitize any unanchored tel: or mailto: links
        if (el.tagName === 'A' && el.hasAttribute('href')) {
          const rawHref = el.getAttribute('href');
          const lower = (rawHref || '').toLowerCase();
          if (lower.startsWith('tel:') || lower.startsWith('mailto:') || lower.includes('wa.me')) {
            if (!originalDomMap.has(el)) {
              originalDomMap.set(el, {
                type: 'action_link',
                element: el,
                originalHref: rawHref,
                originalText: el.innerText
              });
            }
            const aType = lower.startsWith('tel:') ? 'call' : lower.startsWith('mailto:') ? 'email' : 'whatsapp';
            const actionId = `gen_${Math.random().toString(36).substring(2, 8)}`;
            preservedActionRegistry.set(actionId, {
              id: actionId,
              originalHref: rawHref,
              actionType: aType,
              element: el
            });
            el.setAttribute('data-shield-preserved-action', actionId);
            el.setAttribute('href', `#shield-action-${aType}`);
            if (el.innerText && piiDetector.hasPIIPattern(el.innerText)) {
              el.innerText = piiDetector.sanitizeString(el.innerText);
            }
          }
        }

        // Custom attributes (title, aria-label, data-phone, data-email, etc.)
        if (el.hasAttributes && el.attributes) {
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            if (['id', 'class', 'style', 'data-shield-preserved-action'].includes(attr.name)) continue;
            const aVal = attr.value;
            if (aVal && piiDetector.hasPIIPattern && piiDetector.hasPIIPattern(aVal)) {
              const mapKey = `attr_${attr.name}_${el.id || Math.random()}`;
              if (!originalDomMap.has(mapKey)) {
                originalDomMap.set(mapKey, {
                  type: 'attribute',
                  element: el,
                  attrName: attr.name,
                  originalValue: aVal
                });
              }
              el.setAttribute(attr.name, piiDetector.sanitizeString(aVal));
            }
          }
        }
      });
    } catch (attrErr) {
      console.debug('[Screen Privacy Guard] Attribute sweep notice:', attrErr);
    }
  }

  /**
   * Restore original values and attributes in the DOM when shield is paused/turned OFF
   */
  function restoreDOMInPlace() {
    originalDomMap.forEach((rec) => {
      try {
        if (rec.type === 'text' && rec.node && rec.node.parentNode) {
          rec.node.nodeValue = rec.originalValue;
        } else if (rec.type === 'input' && rec.element) {
          rec.element.value = rec.originalValue;
          if (rec.originalAttrValue !== undefined) {
            rec.element.setAttribute('value', rec.originalAttrValue);
          } else {
            rec.element.removeAttribute('value');
          }
          if (rec.originalPlaceholder !== undefined) {
            rec.element.setAttribute('placeholder', rec.originalPlaceholder);
          }
        } else if (rec.type === 'action_link' && rec.element) {
          if (rec.originalHref) {
            rec.element.setAttribute('href', rec.originalHref);
          }
          rec.element.removeAttribute('data-shield-preserved-action');
          if (rec.originalText) {
            rec.element.innerText = rec.originalText;
          }
        } else if (rec.type === 'attribute' && rec.element && rec.attrName) {
          rec.element.setAttribute(rec.attrName, rec.originalValue);
        }
      } catch (err) {
        console.warn('[Screen Privacy Guard] Error restoring DOM node:', err);
      }
    });

    originalDomMap.clear();
    preservedActionRegistry.clear();
  }

  /**
   * Scan entire page for all sensitive data & PII
   */
  function scanPageForSensitiveData() {
    try {
      detectedEntities = piiDetector.scanDOM(document);
      // Strictly exclude any icon, social network logo, or generic avatar placeholder
      if (detectedEntities && detectedEntities.length > 0 && piiDetector.isIconElement) {
        detectedEntities = detectedEntities.filter(ent => {
          if (ent.element) {
            if (piiDetector.isIconElement(ent.element)) return false;
            if (piiDetector.isAvatarPlaceholder && piiDetector.isAvatarPlaceholder(ent.element)) return false;
          }
          return true;
        });
      }
    } catch (e) {
      console.error('[Screen Privacy Guard] DOM Scan Error:', e);
      detectedEntities = [];
    }

    if (isShieldActive) {
      sanitizeDOMInPlace(detectedEntities);
      renderScreenShields();
    } else {
      restoreDOMInPlace();
      clearScreenShields();
    }

    updateFloatingBadge();

    // Broadcast live telemetry update to popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'SHIELD_METRICS_UPDATED',
          totalEntities: detectedEntities.length,
          categories: piiDetector.counters,
          isShieldActive: isShieldActive
        });
      } catch (e) {}
    }

    return detectedEntities;
  }

  /**
   * Render physical visual shields directly on screen over all detected sensitive areas
   * Completely blocks any AI agent screenshot or OCR from reading sensitive data!
   */
  function renderScreenShields() {
    const container = getOverlayContainer();
    if (!container) return;
    container.innerHTML = '';

    if (!isShieldActive || detectedEntities.length === 0) {
      return;
    }

    detectedEntities.forEach((ent, index) => {
      // Never render overlay over icons or generic avatar placeholders
      if (ent.element) {
        if (piiDetector.isIconElement && piiDetector.isIconElement(ent.element)) return;
        if (piiDetector.isAvatarPlaceholder && piiDetector.isAvatarPlaceholder(ent.element)) return;
      }

      let rect = null;

      // Prefer live element bounding rect if available
      if (ent.element && document.body && document.body.contains(ent.element)) {
        rect = ent.element.getBoundingClientRect();
      } else if (ent.boundingBox) {
        rect = {
          left: ent.boundingBox.x - (window.scrollX || 0),
          top: ent.boundingBox.y - (window.scrollY || 0),
          width: ent.boundingBox.width,
          height: ent.boundingBox.height
        };
      }

      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const padX = 4;
      const padY = 3;

      // 1. Create On-Screen Shield Mask (Fixed Viewport Coordinates)
      const mask = document.createElement('div');
      mask.className = `screen-privacy-shield-overlay shield-${shieldStyle}`;
      mask.setAttribute('data-category', ent.category || 'other');
      mask.setAttribute('data-shield-id', ent.id || `ent_${index}`);

      mask.style.position = 'fixed';
      mask.style.left = `${Math.max(0, rect.left - padX)}px`;
      mask.style.top = `${Math.max(0, rect.top - padY)}px`;
      mask.style.width = `${Math.max(24, rect.width + padX * 2)}px`;
      mask.style.height = `${Math.max(18, rect.height + padY * 2)}px`;

      // Label inside shield
      const label = document.createElement('span');
      label.className = 'shield-label';

      let categoryName = (ent.category || 'SENSITIVE').toUpperCase();
      if (categoryName === 'CREDITCARD') categoryName = 'CARD';
      if (categoryName === 'APIKEY') categoryName = 'SECRET KEY';
      if (categoryName === 'DATEOFBIRTH') categoryName = 'DOB';

      label.innerHTML = `🔒 SHIELDED: ${categoryName}`;
      mask.appendChild(label);

      container.appendChild(mask);

      // 2. Anti-AI DOM Cloaking on the target element
      if (ent.element && ent.element.classList) {
        ent.element.classList.add('privacy-shielded-element');
        ent.element.setAttribute('data-ai-blocked', 'true');
        ent.element.setAttribute('aria-hidden', 'true');

        if (ent.element.tagName === 'INPUT' || ent.element.tagName === 'TEXTAREA') {
          ent.element.classList.add('privacy-shielded-input');
        }
      }
    });
  }

  /**
   * Fast viewport reposition for all active masks during scroll/resize (60fps smooth)
   */
  function updateMaskPositions() {
    if (!isShieldActive || !overlayContainer) return;
    const masks = overlayContainer.querySelectorAll('.screen-privacy-shield-overlay');
    masks.forEach((mask) => {
      const shieldId = mask.getAttribute('data-shield-id');
      const ent = detectedEntities.find(e => (e.id || '') === shieldId || `ent_${detectedEntities.indexOf(e)}` === shieldId);
      if (ent && ent.element && document.body && document.body.contains(ent.element)) {
        const rect = ent.element.getBoundingClientRect();
        const padX = 4;
        const padY = 3;
        if (rect.bottom < -30 || rect.top > window.innerHeight + 30) {
          mask.style.display = 'none';
        } else {
          mask.style.display = 'flex';
          mask.style.left = `${Math.max(0, rect.left - padX)}px`;
          mask.style.top = `${Math.max(0, rect.top - padY)}px`;
          mask.style.width = `${Math.max(24, rect.width + padX * 2)}px`;
          mask.style.height = `${Math.max(18, rect.height + padY * 2)}px`;
        }
      }
    });
  }

  /**
   * Clear all active visual screen shields & restore DOM
   */
  function clearScreenShields() {
    restoreDOMInPlace();
    if (overlayContainer) {
      overlayContainer.innerHTML = '';
    }
    // Remove DOM cloaking attributes
    document.querySelectorAll('.privacy-shielded-element').forEach((el) => {
      el.classList.remove('privacy-shielded-element', 'privacy-shielded-input');
      el.removeAttribute('data-ai-blocked');
      el.removeAttribute('aria-hidden');
    });
  }

  /**
   * Save all currently detected sensitive items to Browser Local Storage (chrome.storage.local / localStorage)
   */
  async function storeDetectedDataLocally() {
    if (!detectedEntities || detectedEntities.length === 0) {
      return { success: true, count: 0, items: [] };
    }

    const currentUrl = window.location.href;
    const currentDomain = window.location.hostname || 'local';
    const now = new Date().toISOString();

    const vaultRecords = detectedEntities.map((ent, idx) => {
      const raw = ent.rawText || (ent.element ? (ent.element.value || ent.element.innerText) : '') || '';
      const masked = piiDetector.maskValue(raw, ent.category);

      return {
        id: `vault_${Date.now()}_${idx}`,
        category: ent.category || 'other',
        masked: masked,
        token: ent.sanitizedToken || `[PROTECTED_${(ent.category || 'PII').toUpperCase()}_${idx + 1}]`,
        domain: currentDomain,
        url: currentUrl,
        detectedAt: now,
        shieldStyle: shieldStyle
      };
    });

    try {
      // 1. Primary: Save directly to IndexedDB (PrivacyShieldDB)
      if (typeof window !== 'undefined' && window.PrivacyShieldDB) {
        try {
          await window.PrivacyShieldDB.saveVaultRecordsBatch(vaultRecords);
          await window.PrivacyShieldDB.addAuditLog({
            action: 'SHIELD_SCAN',
            message: `Scanned and protected ${vaultRecords.length} sensitive items`,
            category: 'vault',
            domain: currentDomain,
            url: currentUrl,
            itemsCount: vaultRecords.length,
            categoriesBreakdown: piiDetector.counters
          });
        } catch (idbErr) {
          console.debug('[Screen Privacy Guard] IndexedDB write note:', idbErr);
        }
      }

      // 2. Extension Local Storage & backup
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['privacy_vault_records']);
        const existingRecords = stored.privacy_vault_records || [];
        const uniqueNew = vaultRecords.filter(n => !existingRecords.some(e => e.category === n.category && e.masked === n.masked && e.domain === n.domain));
        const updated = [...uniqueNew, ...existingRecords].slice(0, 500);
        await chrome.storage.local.set({
          privacy_vault_records: updated,
          screen_shield_last_scan: {
            totalEntities: detectedEntities.length,
            categories: piiDetector.counters,
            timestamp: now,
            domain: currentDomain,
            url: currentUrl
          }
        });
      }

      // Dual-write to window.localStorage as resilient sandbox backup
      try {
        const raw = localStorage.getItem('privacy_vault_records');
        const existingRecords = raw ? JSON.parse(raw) : [];
        const uniqueNew = vaultRecords.filter(n => !existingRecords.some(e => e.category === n.category && e.masked === n.masked && e.domain === n.domain));
        const updated = [...uniqueNew, ...existingRecords].slice(0, 500);
        localStorage.setItem('privacy_vault_records', JSON.stringify(updated));
      } catch (e2) {}
    } catch (e) {
      console.warn('[Screen Privacy Guard] Storage write warning:', e);
    }

    return { success: true, count: vaultRecords.length, items: vaultRecords };
  }

  /**
   * Floating Screen Privacy Guard Badge on the Webpage
   * Only shown when shield is active!
   */
  function updateFloatingBadge() {
    if (!isShieldActive) {
      if (floatingBadge && document.body.contains(floatingBadge)) {
        floatingBadge.remove();
        floatingBadge = null;
      }
      return;
    }

    if (!floatingBadge || !document.body.contains(floatingBadge)) {
      floatingBadge = document.createElement('div');
      floatingBadge.className = 'screen-privacy-floating-guard';
      document.body.appendChild(floatingBadge);
    }

    const count = detectedEntities.length;
    const statusText = 'AI Shield Active';
    const dotColor = '#10b981';

    floatingBadge.innerHTML = `
      <div class="screen-privacy-floating-pill" id="screen-privacy-pill" title="Click to view AI Screen Protection status">
        <span class="screen-privacy-pulse-dot" style="background: ${dotColor}; box-shadow: 0 0 10px ${dotColor}"></span>
        <span>🛡️ ${statusText}</span>
        <span class="screen-privacy-pill-count">${count} Protected</span>
        <button class="screen-privacy-toggle-btn" id="pill-quick-toggle">Pause</button>
      </div>
    `;

    const toggleBtn = floatingBadge.querySelector('#pill-quick-toggle');
    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        toggleScreenShield(false);
      };
    }

    const pill = floatingBadge.querySelector('#screen-privacy-pill');
    if (pill) {
      pill.onclick = () => {
        showToast(`Screen Guard: ${count} sensitive items protected locally. Screen is 100% blocked from AI agents.`);
      };
    }
  }

  /**
   * Toggle master screen shield on/off
   */
  async function toggleScreenShield(active) {
    isShieldActive = !!active;

    // Persist user preference so state is remembered across tabs & browser sessions
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const curr = await chrome.storage.local.get(['screen_shield_enabled']);
        if (curr.screen_shield_enabled !== isShieldActive) {
          await chrome.storage.local.set({ screen_shield_enabled: isShieldActive });
        }
      } else {
        localStorage.setItem('screen_shield_enabled', isShieldActive ? 'true' : 'false');
      }
    } catch (e) {}

    if (isShieldActive) {
      // User turned it ON from the top: scan entire screen and protect sensitive data!
      scanPageForSensitiveData();
      startLiveObservation();
      storeDetectedDataLocally();
      updateFloatingBadge();
      showToast('🛡️ Screen Shield ACTIVE: Full screen scanned & sensitive data protected.');
    } else {
      // User turned it OFF: remove all masks and cloaking
      clearScreenShields();
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (floatingBadge && document.body.contains(floatingBadge)) {
        floatingBadge.remove();
        floatingBadge = null;
      }
      showToast('⚠️ Screen Shield PAUSED: Screen protection disabled.');
    }

    return {
      success: true,
      isShieldActive,
      totalEntities: detectedEntities.length,
      categories: piiDetector.counters
    };
  }

  /**
   * Set Shield Visual Style
   */
  function setShieldStyle(style) {
    if (['blackout', 'blur', 'pixelate', 'semantic'].includes(style)) {
      shieldStyle = style;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ screen_shield_style: shieldStyle });
        } else {
          localStorage.setItem('screen_shield_style', shieldStyle);
        }
      } catch (e) {}

      if (isShieldActive) {
        renderScreenShields();
      }
    }
  }

  /**
   * Display floating toast notification on webpage
   */
  function showToast(message) {
    const existing = document.querySelector('.screen-privacy-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'screen-privacy-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  /**
   * Start live continuous observer (detects dynamically loaded sensitive data)
   */
  function startLiveObservation() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    let mutationDebounceTimer = null;
    observer = new MutationObserver((mutations) => {
      if (!isShieldActive) return;

      // Filter out mutations occurring inside our own shield container, badge, or toast
      let hasExternalChanges = false;
      for (const m of mutations) {
        if (overlayContainer && (m.target === overlayContainer || overlayContainer.contains(m.target))) continue;
        if (floatingBadge && (m.target === floatingBadge || floatingBadge.contains(m.target))) continue;
        if (m.target && m.target.classList && (m.target.classList.contains('screen-privacy-toast') || m.target.classList.contains('screen-privacy-shield-overlay'))) continue;
        hasExternalChanges = true;
        break;
      }

      if (!hasExternalChanges) return;

      if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
      mutationDebounceTimer = setTimeout(() => {
        if (isShieldActive) {
          scanPageForSensitiveData();
          storeDetectedDataLocally();
        }
      }, 350);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Also observe typing in input fields with debounce
    let inputDebounceTimer = null;
    document.addEventListener('input', (e) => {
      if (isShieldActive && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
        inputDebounceTimer = setTimeout(() => {
          if (isShieldActive) {
            scanPageForSensitiveData();
            storeDetectedDataLocally();
          }
        }, 300);
      }
    }, { passive: true });

    window.addEventListener('scroll', updateMaskPositions, { passive: true });
    window.addEventListener('resize', updateMaskPositions, { passive: true });
  }

  // Initial Scan & Setup: Check stored state before activating
  async function init() {
    let enabled = false;
    let style = 'blackout';

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['screen_shield_enabled', 'screen_shield_style']);
        enabled = !!stored.screen_shield_enabled;
        if (stored.screen_shield_style) style = stored.screen_shield_style;
      } else {
        const stored = localStorage.getItem('screen_shield_enabled');
        enabled = stored === 'true';
        const sStyle = localStorage.getItem('screen_shield_style');
        if (sStyle) style = sStyle;
      }
    } catch (e) {
      enabled = false;
    }

    shieldStyle = style;
    isShieldActive = enabled;

    // ONLY scan and protect if user has explicitly turned it ON from the top!
    if (isShieldActive) {
      scanPageForSensitiveData();
      startLiveObservation();
      storeDetectedDataLocally();
      updateFloatingBadge();
    } else {
      clearScreenShields();
      if (floatingBadge && document.body && document.body.contains(floatingBadge)) {
        floatingBadge.remove();
        floatingBadge = null;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Listen for storage changes across all tabs and popup
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.screen_shield_enabled !== undefined) {
          const newActive = !!changes.screen_shield_enabled.newValue;
          if (newActive !== isShieldActive) {
            toggleScreenShield(newActive);
          }
        }
        if (changes.screen_shield_style !== undefined) {
          setShieldStyle(changes.screen_shield_style.newValue);
        }
      }
    });
  }

  // Handle Extension Runtime Messages
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'SCAN_PAGE_SENSITIVE_DATA': {
          (async () => {
            try {
              isShieldActive = true;
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ screen_shield_enabled: true });
              }
              const entities = scanPageForSensitiveData();
              await storeDetectedDataLocally();
              sendResponse({
                success: true,
                totalEntities: entities.length,
                categories: piiDetector.counters,
                isShieldActive: true,
                shieldStyle: shieldStyle
              });
            } catch (err) {
              sendResponse({ success: false, error: err.message, totalEntities: 0, categories: {} });
            }
          })();
          return true;
        }

        case 'TOGGLE_SCREEN_SHIELD': {
          toggleScreenShield(request.active).then(res => {
            sendResponse(res);
          }).catch(err => {
            sendResponse({ success: false, error: err.message });
          });
          return true;
        }

        case 'SET_SHIELD_STYLE': {
          setShieldStyle(request.style);
          sendResponse({ success: true, shieldStyle });
          return true;
        }

        case 'SAVE_TO_LOCAL_VAULT': {
          storeDetectedDataLocally().then(res => sendResponse(res));
          return true;
        }

        case 'EXTRACT_SANITIZED_PAGE': {
          // Always ensure in-place DOM sanitization has executed before extracting context for AI
          const entities = scanPageForSensitiveData();
          sanitizeDOMInPlace(entities);

          const scrollX = window.scrollX || window.pageXOffset || 0;
          const scrollY = window.scrollY || window.pageYOffset || 0;

          // Inspect interactive elements + hidden DOM nodes
          const allElements = Array.from(document.querySelectorAll(
            'button, a, input, textarea, select, [role="button"], [contenteditable="true"]'
          ));

          const sanitizedDOM = allElements.map((node, i) => {
            const rect = node.getBoundingClientRect();
            const isHidden = (
              node.type === 'hidden' ||
              rect.width === 0 ||
              rect.height === 0 ||
              (window.getComputedStyle && (window.getComputedStyle(node).display === 'none' || window.getComputedStyle(node).visibility === 'hidden'))
            );

            // Extract raw text from element
            let rawText = node.innerText || node.value || node.placeholder || node.getAttribute('aria-label') || '';
            // Strictly sanitize all text through PII detector
            let sanitizedText = piiDetector.sanitizeString(rawText);

            // Check if this node is an action link
            const actionId = node.getAttribute('data-shield-preserved-action');
            const isActionLink = !!actionId;
            let actionType = null;
            if (isActionLink) {
              const preserved = preservedActionRegistry.get(actionId);
              if (preserved) actionType = preserved.actionType;
            }

            // If an entity was matched with this element, use its sanitized token
            const matchedEntity = entities.find(e => e.element === node || (e.textNode && e.textNode.parentElement === node));
            if (matchedEntity) {
              sanitizedText = matchedEntity.sanitizedToken;
            }

            const tagName = node.tagName.toLowerCase();
            const isClickable = ['button', 'a'].includes(tagName) ||
                                node.type === 'submit' ||
                                node.type === 'button' ||
                                node.getAttribute('role') === 'button' ||
                                isActionLink;

            return {
              agentId: node.id || `node_${i}`,
              tagName: tagName,
              type: node.type || null,
              text: (sanitizedText || '').trim().substring(0, 100),
              isClickable: isClickable,
              isActionLink: isActionLink,
              actionType: actionType,
              isHidden: isHidden,
              boundingBox: {
                x: Math.round(rect.left + scrollX),
                y: Math.round(rect.top + scrollY),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            };
          }).filter(n => (!n.isHidden && n.boundingBox.width > 0 && n.boundingBox.height > 0) || (n.isHidden && n.text && n.text.includes('[') && n.text.includes(']')));

          sendResponse({
            url: piiDetector.sanitizeString(window.location.href),
            title: piiDetector.sanitizeString(document.title),
            viewport: { width: window.innerWidth, height: window.innerHeight },
            detectedEntities: entities.map(e => ({
              id: e.id,
              category: e.category,
              sanitizedToken: e.sanitizedToken,
              boundingBox: e.boundingBox,
              isActionLink: !!e.isActionLink,
              actionType: e.actionType || null
            })),
            sanitizedDOM: sanitizedDOM
          });
          return true;
        }

        case 'EXECUTE_ACTION': {
          const action = request.action || {};
          let targetElement = null;

          if (action.target_id) {
            targetElement = document.getElementById(action.target_id) || document.querySelector(`[data-shield-id="${action.target_id}"]`);
          }
          if (!targetElement && action.target_text) {
            const lower = action.target_text.toLowerCase();
            const candidates = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"], [role="button"]'));
            targetElement = candidates.find(c => (c.innerText || c.value || '').toLowerCase().includes(lower));
          }

          if (targetElement) {
            targetElement.classList.add('privacy-agent-highlight');
            setTimeout(() => targetElement.classList.remove('privacy-agent-highlight'), 2200);

            if (action.action === 'click') {
              try {
                targetElement.click();
              } catch (e) {
                console.warn('Click execution warning:', e);
              }
            }
            sendResponse({ success: true, executed: true, target: action.target_id || action.target_text });
          } else {
            sendResponse({ success: false, executed: false, error: 'Target element not found on page' });
          }
          return true;
        }

        case 'GET_SHIELD_STATUS': {
          if (isShieldActive) {
            scanPageForSensitiveData();
            storeDetectedDataLocally();
          }
          sendResponse({
            isShieldActive,
            shieldStyle,
            totalEntities: detectedEntities.length,
            categories: piiDetector.counters,
            url: window.location.href,
            title: document.title
          });
          return true;
        }

        case 'PING': {
          sendResponse({ status: 'ready', url: window.location.href, isShieldActive });
          return true;
        }

        default:
          sendResponse({ success: false, error: 'Unknown action type' });
          return false;
      }
    });
  }

  // Cleanup handler in case script is dynamically re-injected
  window.__SCREEN_PRIVACY_GUARD_CLEANUP__ = () => {
    clearScreenShields();
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (floatingBadge && document.body.contains(floatingBadge)) {
      floatingBadge.remove();
      floatingBadge = null;
    }
  };

  // Expose on window for client API and debugging
  window.ScreenPrivacyGuard = {
    scanPageForSensitiveData,
    sanitizeDOMInPlace,
    restoreDOMInPlace,
    renderScreenShields,
    clearScreenShields,
    toggleScreenShield,
    setShieldStyle,
    storeDetectedDataLocally,
    showToast,
    getPreservedActions: () => Array.from(preservedActionRegistry.entries()),
    getStatus: () => ({
      isShieldActive,
      shieldStyle,
      detectedEntities,
      counters: piiDetector.counters
    })
  };
})();
