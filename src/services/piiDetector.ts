/**
 * SECUREVISION AI - Layered PII Detector
 * Layer 1: DOM metadata inspection (input types, autocomplete attributes, label heuristics)
 * Layer 2: OCR & Text pattern recognition (Email, Phone, Credit Cards, Aadhaar/SSN, Auth Tokens)
 * Layer 3: Visual bounding-box coordinate mapping
 * 
 * Strict Client-Side Execution: No sensitive text leaves this layer unmasked.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedPII {
  id: string;
  category: 'email' | 'phone' | 'password' | 'card' | 'identity' | 'address' | 'face' | 'field';
  label: string;
  originalText?: string;
  redactedPlaceholder: string;
  boundingBox: BoundingBox;
  confidence: number;
  source: 'dom' | 'ocr' | 'vision';
}

// Regex patterns for client-side text identification
export const PII_REGEX = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  cvv: /\b\d{3,4}\b/g,
  aadhaar: /\b\d{4}\s\d{4}\s\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  token: /\b(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|ghp_[a-zA-Z0-9]{36}|sk-[a-zA-Z0-9]{20,})\b/g,
};

/**
 * Validates credit card number with Luhn algorithm
 */
export function isValidLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isSecond = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (isSecond) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isSecond = !isSecond;
  }
  return sum % 10 === 0;
}

/**
 * Scan a text string for PII and return detected matches
 */
export function scanTextForPII(text: string): Array<{ category: DetectedPII['category']; match: string; placeholder: string }> {
  const results: Array<{ category: DetectedPII['category']; match: string; placeholder: string }> = [];
  if (!text) return results;

  // 1. Email
  const emails = text.match(PII_REGEX.email);
  if (emails) {
    emails.forEach((m, idx) => {
      results.push({ category: 'email', match: m, placeholder: `[REDACTED_EMAIL_${idx + 1}]` });
    });
  }

  // 2. Credit Card
  const cards = text.match(PII_REGEX.creditCard);
  if (cards) {
    cards.forEach((m, idx) => {
      results.push({ category: 'card', match: m, placeholder: `[REDACTED_CARD_${idx + 1}]` });
    });
  }

  // 3. Phone
  const phones = text.match(PII_REGEX.phone);
  if (phones) {
    phones.forEach((m, idx) => {
      // Avoid false positive matching short numbers
      if (m.replace(/\D/g, '').length >= 10) {
        results.push({ category: 'phone', match: m, placeholder: `[REDACTED_PHONE_${idx + 1}]` });
      }
    });
  }

  // 4. Identity (Aadhaar / SSN)
  const aadhaars = text.match(PII_REGEX.aadhaar);
  if (aadhaars) {
    aadhaars.forEach((m, idx) => {
      results.push({ category: 'identity', match: m, placeholder: `[REDACTED_ID_${idx + 1}]` });
    });
  }

  const ssns = text.match(PII_REGEX.ssn);
  if (ssns) {
    ssns.forEach((m, idx) => {
      results.push({ category: 'identity', match: m, placeholder: `[REDACTED_SSN_${idx + 1}]` });
    });
  }

  // 5. Auth Tokens / Secret Keys
  const tokens = text.match(PII_REGEX.token);
  if (tokens) {
    tokens.forEach((m, idx) => {
      results.push({ category: 'password', match: m, placeholder: `[REDACTED_SECRET_${idx + 1}]` });
    });
  }

  return results;
}

/**
 * Scan DOM elements in a document and extract sensitive items with bounding boxes
 */
export function scanDOMForPII(doc: Document = document): DetectedPII[] {
  const detected: DetectedPII[] = [];
  let counter = 1;

  // 1. Password Inputs
  const passwordInputs = doc.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      detected.push({
        id: `pii-pwd-${counter++}`,
        category: 'password',
        label: 'Password Input Field',
        redactedPlaceholder: '[REDACTED_PASSWORD]',
        boundingBox: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
        confidence: 0.99,
        source: 'dom',
      });
    }
  });

  // 2. Autocomplete and Card Inputs
  const sensitiveSelectors = [
    'input[autocomplete*="cc-"]',
    'input[autocomplete="email"]',
    'input[autocomplete="tel"]',
    'input[name*="card"]',
    'input[name*="cvv"]',
    'input[name*="ssn"]',
    'input[name*="aadhaar"]',
    'input[name*="account"]',
    'input[name*="secret"]',
    'input[name*="token"]',
  ];

  const sensitiveInputs = doc.querySelectorAll(sensitiveSelectors.join(','));
  sensitiveInputs.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const name = (el.getAttribute('name') || el.getAttribute('autocomplete') || 'field').toLowerCase();
      let cat: DetectedPII['category'] = 'field';
      if (name.includes('card') || name.includes('cc-') || name.includes('cvv')) cat = 'card';
      else if (name.includes('email')) cat = 'email';
      else if (name.includes('tel') || name.includes('phone')) cat = 'phone';
      else if (name.includes('ssn') || name.includes('aadhaar')) cat = 'identity';

      detected.push({
        id: `pii-input-${counter++}`,
        category: cat,
        label: `${cat.toUpperCase()} Field (${name})`,
        redactedPlaceholder: `[REDACTED_${cat.toUpperCase()}]`,
        boundingBox: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
        confidence: 0.95,
        source: 'dom',
      });
    }
  });

  return detected;
}
