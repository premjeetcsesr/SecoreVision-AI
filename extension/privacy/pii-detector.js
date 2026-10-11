/**
 * Privacy-Preserving Vision Agent - Client-Side PII Detector
 * Detects Personally Identifiable Information (PII) and sensitive data locally inside the browser.
 * Uses Hybrid Approach: DOM Element Inspection + Regex Analysis + Contextual Heuristics.
 */

class PIIDetector {
  constructor() {
    // Regex Patterns for Sensitive Entities
    this.patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g,
      phone: /(?:(?:\+|00)\d{1,4}[-.\s]?)?(?:(?:\(\d{1,5}\)|\d{1,5})[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}(?:[-.\s]?\d{1,4})?\b|\b[6-9]\d{9}\b|\b\d{10,12}\b/g,
      creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{15,16}\b/g,
      cvv: /\b(?:CVV|CVC|CID|Security Code)\s*[:#]?\s*\d{3,4}\b|\b\d{3,4}\b(?=\s*(?:CVV|CVC))/gi,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      aadhaar: /\b[2-9]{1}\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      panCard: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
      dateOfBirth: /\b(?:0[1-9]|1[0-2])[\/\-\.](?:0[1-9]|[12]\d|3[01])[\/\-\.](?:19|20)\d{2}\b/g,
      apiKey: /\b(?:sk-[A-Za-z0-9_\-]{16,}|ghp_[A-Za-z0-9]{25,}|gho_[A-Za-z0-9]{25,}|AIza[0-9A-Za-z_\-]{25,}|AKIA[0-9A-Z]{16}|bearer\s+[A-Za-z0-9_\-\.]{25,})\b/gi,
      jwt: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      bankAccount: /\b(?:[A-Z]{2}\d{2}[A-Z0-9]{11,30}|\b\d{9,18}\b(?=\s*(?:account|acct|bank|routing)))/gi,
      ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      zipCode: /\b\d{5}(?:-\d{4})?\b/g
    };

    // Sensitive DOM Keywords
    this.sensitiveKeywords = [
      'password', 'passwd', 'pwd', 'secret', 'pin', 'passcode',
      'ssn', 'social-security', 'national-id', 'aadhaar', 'uidai', 'pan', 'sin',
      'card', 'creditcard', 'cc-number', 'cvv', 'cvc', 'expiry', 'exp-date', 'cardholder',
      'email', 'e-mail', 'mail',
      'phone', 'telephone', 'mobile', 'cell', 'tel', 'whatsapp',
      'address', 'street', 'billing', 'shipping', 'zipcode', 'postal', 'city',
      'dob', 'birth', 'birthday',
      'salary', 'income', 'bank', 'account-number', 'routing', 'iban', 'swift',
      'passport', 'license', 'token', 'auth', 'bearer', 'tax', 'api-key', 'secret-key',
      'full-name', 'fullname', 'first-name', 'firstname', 'last-name', 'lastname', 'username', 'user-name', 'emp-name', 'applicant-name'
    ];

    this.counters = {
      email: 0,
      phone: 0,
      creditCard: 0,
      ssn: 0,
      aadhaar: 0,
      panCard: 0,
      password: 0,
      name: 0,
      address: 0,
      face: 0,
      apiKey: 0,
      jwt: 0,
      bankAccount: 0,
      other: 0
    };
  }

  /**
   * Reset entity counters
   */
  resetCounters() {
    for (const key in this.counters) {
      this.counters[key] = 0;
    }
  }

  /**
   * Validate Luhn Algorithm for Credit Cards
   */
  isValidCreditCard(numberStr) {
    const digits = numberStr.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  /**
   * Check if a DOM element is an icon, social media badge, or SVG graphic
   * (Strictly excluded from being masked or flagged as PII)
   */
  isIconElement(el) {
    if (!el || (el.nodeType !== 1 && el.nodeType !== undefined)) return false;

    // SVG and SVG sub-elements are always icons/graphics
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'svg' || tag === 'path' || tag === 'use' || tag === 'g' || tag === 'circle' || tag === 'polygon') return true;
    if (el.closest && el.closest('svg')) return true;

    // Attribute inspection
    const cls = String(el.className || '').toLowerCase();
    const id = String(el.id || '').toLowerCase();
    const role = String(el.getAttribute ? el.getAttribute('role') || '' : '').toLowerCase();
    const ariaLabel = String(el.getAttribute ? el.getAttribute('aria-label') || '' : '').toLowerCase();
    const title = String(el.getAttribute ? el.getAttribute('title') || '' : '').toLowerCase();

    // Universal Icon & Social Media Brands Regex (Instagram, Facebook, YouTube, etc.)
    const iconRegex = /(?:icon|logo|favicon|symbol|badge|emoji|btn-icon|nav-icon|social|instagram|insta|facebook|fb-|youtube|yt-|twitter|x-logo|tiktok|linkedin|github|whatsapp|telegram|discord|reddit|pinterest|snapchat|threads)/i;

    if (iconRegex.test(cls) || iconRegex.test(id) || iconRegex.test(ariaLabel) || iconRegex.test(title)) {
      return true;
    }

    if (role === 'img' && (iconRegex.test(cls) || iconRegex.test(ariaLabel) || tag === 'svg' || tag === 'i' || tag === 'span')) {
      return true;
    }

    // Font Icon Libraries (FontAwesome, Bootstrap Icons, Material Icons, Feather, Lucide, Tabler)
    if (/\b(?:fa[srbld]?|bi|material-icons|feather|tabler|lucide|dashicons|glyphicons?)\b/.test(cls) ||
        /\b(?:fa-|bi-|icon-|glyphicon-)\b/.test(cls)) {
      return true;
    }

    if (tag === 'i' || tag === 'em') {
      if (cls.includes('icon') || cls.includes('fa') || cls.includes('bi') || !el.textContent || el.textContent.trim().length <= 3) {
        return true;
      }
    }

    // Image tag specific check
    if (tag === 'img') {
      const src = String(el.src || (el.getAttribute ? el.getAttribute('src') : '') || '').toLowerCase();
      const alt = String(el.alt || (el.getAttribute ? el.getAttribute('alt') : '') || '').toLowerCase();

      if (iconRegex.test(src) || iconRegex.test(alt)) return true;
      if (src.endsWith('.svg') || src.endsWith('.ico') || src.includes('.svg?') || src.includes('data:image/svg+xml')) return true;

      // Small icons/favicons
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      const w = rect ? rect.width : (el.width || 0);
      const h = rect ? rect.height : (el.height || 0);
      if (w > 0 && h > 0 && w <= 32 && h <= 32 && !src.includes('photo') && !cls.includes('photo')) {
        return true;
      }
    }

    // Check if inside an icon button or social media container
    if (el.closest) {
      const iconParent = el.closest('button.icon, a.icon, .social-icons, .social-links, .social-media, .social-share, .nav-icons, .btn-icon');
      if (iconParent && tag !== 'a' && tag !== 'button') return true;
    }

    return false;
  }

  /**
   * Check if an element is a generic avatar placeholder/silhouette/drawing (NOT a real human face)
   * The user explicitly requested to never hide avatar placeholders or generic icons.
   */
  isAvatarPlaceholder(el) {
    if (!el || (el.nodeType !== 1 && el.nodeType !== undefined)) return false;

    const tag = (el.tagName || '').toLowerCase();
    const cls = String(el.className || '').toLowerCase();
    const id = String(el.id || '').toLowerCase();
    const src = String(el.src || (el.getAttribute ? el.getAttribute('src') : '') || '').toLowerCase();
    const alt = String(el.alt || (el.getAttribute ? el.getAttribute('alt') : '') || '').toLowerCase();

    // Generic avatar placeholder pattern (illustrations, silhouettes, defaults, vector art)
    const placeholderPattern = /(?:default[-_]?avatar|avatar[-_]?placeholder|avatar[-_]?icon|user[-_]?icon|user[-_]?placeholder|silhouette|dummy[-_]?avatar|guest[-_]?avatar|no[-_]?avatar|blank[-_]?profile|user[-_]?silhouette)/i;

    if (placeholderPattern.test(cls) || placeholderPattern.test(id) || placeholderPattern.test(src) || placeholderPattern.test(alt)) {
      return true;
    }

    // SVG graphics representing avatars are illustrations/vectors, NOT real human faces
    if (tag === 'svg' || (tag === 'img' && (src.endsWith('.svg') || src.includes('image/svg+xml')))) {
      return true;
    }

    return false;
  }

  /**
   * Check if a DOM element attribute hints at sensitive content
   */
  isSensitiveElement(element) {
    if (!element || !element.getAttribute) return { sensitive: false };

    // Strictly ignore icons, logos, and SVGs from being sensitive form elements
    if (this.isIconElement(element)) return { sensitive: false };

    const type = (element.type || '').toLowerCase();
    if (type === 'password') return { sensitive: true, category: 'password', confidence: 1.0 };
    if (type === 'email') return { sensitive: true, category: 'email', confidence: 0.95 };
    if (type === 'tel') return { sensitive: true, category: 'phone', confidence: 0.95 };

    const attrs = [
      element.id,
      element.name,
      element.className,
      element.placeholder,
      element.getAttribute('aria-label'),
      element.getAttribute('autocomplete'),
      element.getAttribute('data-field')
    ];

    // Also inspect associated label text or parent container label
    try {
      if (element.id && document.querySelector) {
        const lbl = document.querySelector(`label[for="${element.id}"]`);
        if (lbl) attrs.push(lbl.innerText);
      }
      if (element.parentElement) {
        const prev = element.previousElementSibling;
        if (prev && (prev.tagName === 'LABEL' || (prev.className && String(prev.className).includes('label')))) {
          attrs.push(prev.innerText);
        }
        const parentLbl = element.parentElement.querySelector('label, .field-label, .form-label');
        if (parentLbl) attrs.push(parentLbl.innerText);
      }
    } catch (e) {}

    const attrsToCheck = attrs.filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

    for (const kw of this.sensitiveKeywords) {
      if (attrsToCheck.includes(kw)) {
        let category = 'other';
        if (kw.includes('pass') || kw.includes('pwd') || kw.includes('pin') || kw.includes('secret')) category = 'password';
        else if (kw.includes('card') || kw.includes('cvv') || kw.includes('cc')) category = 'creditCard';
        else if (kw.includes('ssn') || kw.includes('social') || kw.includes('tax')) category = 'ssn';
        else if (kw.includes('mail')) category = 'email';
        else if (kw.includes('phone') || kw.includes('tel') || kw.includes('mobile')) category = 'phone';
        else if (kw.includes('address') || kw.includes('street') || kw.includes('zip')) category = 'address';
        else if (kw.includes('dob') || kw.includes('birth')) category = 'dateOfBirth';
        else if (kw.includes('account') || kw.includes('bank') || kw.includes('iban')) category = 'creditCard';
        else if (kw.includes('aadhaar') || kw.includes('uidai')) category = 'aadhaar';
        else if (kw.includes('pan')) category = 'panCard';
        else if (kw.includes('name') || kw.includes('fname') || kw.includes('lname') || kw.includes('user')) category = 'name';

        return { sensitive: true, category, confidence: 0.90, keyword: kw };
      }
    }

    return { sensitive: false };
  }

  /**
   * Scan entire Document DOM for sensitive input fields, values, and text blocks
   * @param {Document|HTMLElement} rootNode - Root node to scan
   * @returns {Array<Object>} List of detected PII regions with coordinates
   */
  scanDOM(rootNode = document) {
    this.resetCounters();
    const detectedEntities = [];
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // 1. Scan Form Inputs (<input>, <textarea>, <select>, hidden nodes)
    const inputs = rootNode.querySelectorAll ? rootNode.querySelectorAll('input, textarea, select, [contenteditable="true"]') : [];
    inputs.forEach((input, index) => {
      const rect = input.getBoundingClientRect();
      const isHidden = (rect.width === 0 || rect.height === 0 || 
                        (input.type === 'hidden') ||
                        (window.getComputedStyle && (window.getComputedStyle(input).visibility === 'hidden' || window.getComputedStyle(input).display === 'none')));

      const sensitivity = this.isSensitiveElement(input);
      const val = (input.value || input.innerText || input.placeholder || '').trim();

      if (sensitivity.sensitive || (val && this.hasPIIPattern(val))) {
        let category = sensitivity.category || this.detectValueCategory(val);
        if (category === 'other' && val) {
          const detectedCat = this.detectValueCategory(val);
          if (detectedCat !== 'other') category = detectedCat;
        }
        this.counters[category] = (this.counters[category] || 0) + 1;
        const entityId = `${category.toUpperCase()}_${this.counters[category]}`;

        detectedEntities.push({
          id: entityId,
          category: category,
          type: isHidden ? 'dom_hidden_input' : 'dom_input',
          rawText: val,
          sanitizedToken: `[${entityId}]`,
          element: input,
          elementId: input.id || input.name || `input_${index}`,
          isHidden: isHidden,
          boundingBox: {
            x: Math.round(rect.left + scrollX),
            y: Math.round(rect.top + scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          confidence: sensitivity.confidence || 0.88
        });
      }
    });

    // 2. Scan Text Nodes & Labels on the page
    const walker = (rootNode.createTreeWalker) ? rootNode.createTreeWalker(
      rootNode.body || rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (this.isIconElement(parent)) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'canvas', 'svg'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.nodeValue.trim().length === 0) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    ) : null;

    if (walker) {
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue;
        const textEntities = this.scanText(text, node.parentElement);
        textEntities.forEach(ent => {
          ent.textNode = node;
          ent.element = node.parentElement;
          // Compute bounding box using Range
          try {
            const range = document.createRange();
            range.selectNodeContents(node);
            let rect = range.getBoundingClientRect();
            if (!rect || rect.width === 0 || rect.height === 0) {
              range.selectNodeContents(node.parentElement);
              rect = range.getBoundingClientRect();
            }
            ent.boundingBox = {
              x: Math.round(rect.left + scrollX),
              y: Math.round(rect.top + scrollY),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            };
          } catch (e) {
            ent.boundingBox = { x: 0, y: 0, width: 0, height: 0 };
          }
          detectedEntities.push(ent);
        });
      }
    }

    // 3. Scan Action Links (<a href="tel:...", "mailto:...", "wa.me/...")
    const links = rootNode.querySelectorAll ? rootNode.querySelectorAll('a[href], button[data-action], [data-href]') : [];
    links.forEach((link, idx) => {
      // Never treat standalone icons or social media links as PII action links
      if (this.isIconElement(link)) return;

      const rawHref = link.getAttribute('href') || link.getAttribute('data-href') || '';
      const lowerHref = rawHref.toLowerCase();
      let actionType = null;
      let category = null;
      let rawVal = '';

      if (lowerHref.startsWith('tel:')) {
        actionType = 'call';
        category = 'phone';
        rawVal = rawHref.replace(/^tel:/i, '').split('?')[0].trim();
      } else if (lowerHref.startsWith('mailto:')) {
        actionType = 'email';
        category = 'email';
        rawVal = rawHref.replace(/^mailto:/i, '').split('?')[0].trim();
      } else if (lowerHref.includes('wa.me') || lowerHref.includes('whatsapp.com')) {
        // Only if it has an actual telephone digits target
        const match = lowerHref.match(/(?:wa\.me\/|phone=)(\+?\d+)/);
        if (match && match[1] && match[1].length >= 7) {
          actionType = 'whatsapp';
          category = 'phone';
          rawVal = match[1];
        }
      }

      if (actionType && category) {
        this.counters[category] = (this.counters[category] || 0) + 1;
        const entityId = `${category.toUpperCase()}_${this.counters[category]}`;
        const rect = link.getBoundingClientRect();

        detectedEntities.push({
          id: entityId,
          category: category,
          actionType: actionType,
          isActionLink: true,
          type: 'action_link',
          rawText: rawVal || rawHref,
          originalHref: rawHref,
          sanitizedToken: `[${entityId}]`,
          element: link,
          elementId: link.id || `action_link_${idx}`,
          boundingBox: {
            x: Math.round(rect.left + scrollX),
            y: Math.round(rect.top + scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          confidence: 0.99
        });
      }
    });

    // 4. Scan Image Elements for REAL Human Face Detection
    // Strictly NO Icons (Instagram, Facebook, YouTube, SVG) and NO generic Avatars
    const images = rootNode.querySelectorAll ? rootNode.querySelectorAll('img') : [];
    images.forEach((img, idx) => {
      // 1. Strictly skip if icon, social media logo, or generic avatar placeholder
      if (this.isIconElement(img) || this.isAvatarPlaceholder(img)) {
        return;
      }

      const rect = img.getBoundingClientRect();
      const w = rect.width || img.naturalWidth || img.width || 0;
      const h = rect.height || img.naturalHeight || img.height || 0;

      // Small icons and UI bullets are never human faces
      if (w < 28 || h < 28) return;

      // Ensure face detector instance is initialized
      if (!this.faceDetector) {
        if (typeof FaceDetector !== 'undefined') {
          this.faceDetector = new FaceDetector();
        } else if (typeof window !== 'undefined' && window.FaceDetector) {
          this.faceDetector = new window.FaceDetector();
        }
      }

      if (this.faceDetector && typeof this.faceDetector.detectFacesSync === 'function') {
        const detectedFaces = this.faceDetector.detectFacesSync(img);
        if (detectedFaces && detectedFaces.length > 0) {
          detectedFaces.forEach((f, fIdx) => {
            this.counters.face = (this.counters.face || 0) + 1;
            const entityId = `FACE_${this.counters.face}`;
            const bBox = f.boundingBox || {};

            let fx = Math.round(rect.left + scrollX);
            let fy = Math.round(rect.top + scrollY);
            let fw = Math.round(rect.width || w);
            let fh = Math.round(rect.height || h);

            if (bBox.relative && bBox.width && bBox.height) {
              fx = Math.round(rect.left + scrollX + (bBox.x || 0));
              fy = Math.round(rect.top + scrollY + (bBox.y || 0));
              fw = Math.round(bBox.width);
              fh = Math.round(bBox.height);
            }

            detectedEntities.push({
              id: entityId,
              category: 'face',
              type: 'visual_face',
              rawText: '[HUMAN_FACE_PHOTO]',
              sanitizedToken: `[${entityId}]`,
              element: img,
              elementId: img.id || `face_img_${idx}_${fIdx}`,
              boundingBox: {
                x: fx,
                y: fy,
                width: fw,
                height: fh
              },
              confidence: f.confidence || 0.94
            });
          });
        }
      }
    });

    return detectedEntities;
  }

  /**
   * Check if arbitrary text contains any PII pattern
   */
  hasPIIPattern(text) {
    if (!text || typeof text !== 'string') return false;
    for (const [key, pattern] of Object.entries(this.patterns)) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) return true;
    }
    return false;
  }

  /**
   * Detect category of arbitrary string value
   */
  detectValueCategory(text) {
    if (!text) return 'other';
    for (const [cat, pattern] of Object.entries(this.patterns)) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) return cat;
    }
    return 'other';
  }

  /**
   * Scan plain string text for PII matches using Regex and Context heuristics
   */
  scanText(text, parentElement = null) {
    if (!text || text.length < 3) return [];
    const results = [];

    // Email matching
    const emailMatches = text.match(this.patterns.email);
    if (emailMatches) {
      emailMatches.forEach(match => {
        this.counters.email = (this.counters.email || 0) + 1;
        const id = `EMAIL_${this.counters.email}`;
        results.push({
          id,
          category: 'email',
          type: 'text_regex',
          rawText: match,
          sanitizedToken: `[${id}]`,
          confidence: 0.98
        });
      });
    }

    // Phone matching
    const phoneMatches = text.match(this.patterns.phone);
    if (phoneMatches) {
      phoneMatches.forEach(match => {
        if (match.replace(/\D/g, '').length >= 7) {
          this.counters.phone = (this.counters.phone || 0) + 1;
          const id = `PHONE_${this.counters.phone}`;
          results.push({
            id,
            category: 'phone',
            type: 'text_regex',
            rawText: match,
            sanitizedToken: `[${id}]`,
            confidence: 0.95
          });
        }
      });
    }

    // SSN matching
    const ssnMatches = text.match(this.patterns.ssn);
    if (ssnMatches) {
      ssnMatches.forEach(match => {
        this.counters.ssn = (this.counters.ssn || 0) + 1;
        const id = `SSN_${this.counters.ssn}`;
        results.push({
          id,
          category: 'ssn',
          type: 'text_regex',
          rawText: match,
          sanitizedToken: `[${id}]`,
          confidence: 0.99
        });
      });
    }

    // Credit Card matching
    const cardMatches = text.match(this.patterns.creditCard);
    if (cardMatches) {
      cardMatches.forEach(match => {
        if (this.isValidCreditCard(match) || match.replace(/\D/g, '').length >= 15) {
          this.counters.creditCard = (this.counters.creditCard || 0) + 1;
          const id = `CARD_${this.counters.creditCard}`;
          results.push({
            id,
            category: 'creditCard',
            type: 'text_regex',
            rawText: match,
            sanitizedToken: `[${id}]`,
            confidence: 0.96
          });
        }
      });
    }

    // Aadhaar matching
    const aadhaarMatches = text.match(this.patterns.aadhaar);
    if (aadhaarMatches) {
      aadhaarMatches.forEach(match => {
        this.counters.aadhaar = (this.counters.aadhaar || 0) + 1;
        const id = `AADHAAR_${this.counters.aadhaar}`;
        results.push({
          id,
          category: 'aadhaar',
          type: 'text_regex',
          rawText: match,
          sanitizedToken: `[${id}]`,
          confidence: 0.98
        });
      });
    }

    // PAN Card matching
    const panMatches = text.match(this.patterns.panCard);
    if (panMatches) {
      panMatches.forEach(match => {
        this.counters.panCard = (this.counters.panCard || 0) + 1;
        const id = `PAN_${this.counters.panCard}`;
        results.push({
          id,
          category: 'panCard',
          type: 'text_regex',
          rawText: match,
          sanitizedToken: `[${id}]`,
          confidence: 0.97
        });
      });
    }

    // API Key & Bearer Token matching
    const apiKeyMatches = text.match(this.patterns.apiKey);
    if (apiKeyMatches) {
      apiKeyMatches.forEach(match => {
        this.counters.apiKey = (this.counters.apiKey || 0) + 1;
        const id = `KEY_${this.counters.apiKey}`;
        results.push({
          id,
          category: 'apiKey',
          type: 'text_regex',
          rawText: match,
          sanitizedToken: `[${id}]`,
          confidence: 0.99
        });
      });
    }

    // JWT Token matching
    const jwtMatches = text.match(this.patterns.jwt);
    if (jwtMatches) {
      jwtMatches.forEach(match => {
        this.counters.jwt = (this.counters.jwt || 0) + 1;
        const id = `JWT_${this.counters.jwt}`;
        results.push({
          id,
          category: 'jwt',
          type: 'text_regex',
          rawText: match,
          sanitizedToken: `[${id}]`,
          confidence: 0.99
        });
      });
    }

    // Contextual Name Detection: Look for patterns like "Name: John Doe", "Full Name: Jane Smith"
    const nameMatch = text.match(/(?:Name|Full Name|Customer Name|Employee Name|Cardholder Name)\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameMatch && nameMatch[1]) {
      this.counters.name = (this.counters.name || 0) + 1;
      const id = `PERSON_${this.counters.name}`;
      results.push({
        id,
        category: 'name',
        type: 'text_context',
        rawText: nameMatch[1],
        sanitizedToken: `[${id}]`,
        confidence: 0.91
      });
    }

    return results;
  }

  /**
   * Helper to safely mask a sensitive value for safe local display and storage
   */
  maskValue(value, category = 'other') {
    if (!value || typeof value !== 'string') return '••••••••';
    const val = value.trim();
    if (val.length === 0) return '••••';

    switch (category) {
      case 'email': {
        const parts = val.split('@');
        if (parts.length === 2) {
          const name = parts[0];
          const domain = parts[1];
          const maskedName = name.length > 2 ? `${name[0]}••••${name[name.length - 1]}` : `${name[0]}••`;
          return `${maskedName}@${domain}`;
        }
        return `${val.substring(0, 2)}••••@••••`;
      }
      case 'creditCard': {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) {
          return `•••• •••• •••• ${digits.slice(-4)}`;
        }
        return '•••• •••• •••• ••••';
      }
      case 'phone': {
        const hasPlus = val.startsWith('+');
        return hasPlus ? '+•• ••••••••••' : '••••••••••';
      }
      case 'ssn':
      case 'aadhaar': {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) {
          return `•••• •••• ${digits.slice(-4)}`;
        }
        return '•••• •••• ••••';
      }
      case 'panCard': {
        return `${val.slice(0, 2)}••••••${val.slice(-1)}`;
      }
      case 'password':
      case 'apiKey':
      case 'jwt': {
        return '••••••••••••••••';
      }
      case 'name': {
        const parts = val.split(/\s+/);
        return parts.map(p => p.length > 2 ? `${p[0]}••••${p[p.length - 1]}` : `${p[0]}••`).join(' ');
      }
      case 'address': {
        return val.length > 8 ? `${val.substring(0, 3)}••••••••${val.slice(-3)}` : '••••••••••••';
      }
      case 'face': {
        return '[SHIELDED_FACE]';
      }
      default: {
        if (val.length > 6) {
          return `${val.slice(0, 2)}••••${val.slice(-2)}`;
        }
        return '••••••••';
      }
    }
  }

  /**
   * Sanitize an arbitrary text string by replacing all PII occurrences with token placeholders
   */
  sanitizeString(text) {
    if (!text || typeof text !== 'string') return text;
    let sanitized = text;

    // Replace emails
    sanitized = sanitized.replace(this.patterns.email, '[EMAIL]');
    // Replace SSNs
    sanitized = sanitized.replace(this.patterns.ssn, '[SSN]');
    // Replace Aadhaar
    sanitized = sanitized.replace(this.patterns.aadhaar, '[AADHAAR]');
    // Replace PAN
    sanitized = sanitized.replace(this.patterns.panCard, '[PAN_CARD]');
    // Replace API keys
    sanitized = sanitized.replace(this.patterns.apiKey, '[API_KEY]');
    // Replace JWTs
    sanitized = sanitized.replace(this.patterns.jwt, '[JWT_TOKEN]');
    // Replace Credit Cards
    sanitized = sanitized.replace(this.patterns.creditCard, (match) => {
      return (match.replace(/\D/g, '').length >= 13) ? '[CREDIT_CARD]' : match;
    });
    // Replace Phone numbers
    sanitized = sanitized.replace(this.patterns.phone, (match) => {
      return (match.replace(/\D/g, '').length >= 7) ? '[PHONE]' : match;
    });

    return sanitized;
  }
}

// Export for extension and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PIIDetector };
}
if (typeof window !== 'undefined') {
  window.PIIDetector = PIIDetector;
}
