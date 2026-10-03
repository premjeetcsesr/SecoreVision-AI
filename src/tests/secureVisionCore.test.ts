import { describe, it, expect } from 'vitest';
import { scanTextForPII, isValidLuhn } from '../services/piiDetector';
import { redactTextOpaque } from '../services/redactionEngine';
import { PrivacyGate } from '../services/privacyGate';
import { ActionValidator, ProposedAction } from '../services/actionValidator';

describe('SECUREVISION AI - Core Security & Privacy Test Suite', () => {
  describe('Layer 2: PII Detection & Luhn Validation', () => {
    it('detects sensitive email addresses correctly', () => {
      const text = 'Contact user at premjeet@example.com for support.';
      const matches = scanTextForPII(text);
      expect(matches.length).toBe(1);
      expect(matches[0].category).toBe('email');
      expect(matches[0].match).toBe('premjeet@example.com');
    });

    it('detects credit card numbers and formats', () => {
      const text = 'Payment with card 4000 1234 5678 9010 on checkout.';
      const matches = scanTextForPII(text);
      expect(matches.length).toBe(1);
      expect(matches[0].category).toBe('card');
    });

    it('validates test credit cards with Luhn check', () => {
      expect(isValidLuhn('49927398716')).toBe(true);
      expect(isValidLuhn('49927398717')).toBe(false);
    });

    it('detects phone numbers and secret tokens', () => {
      const text = 'Call +1-555-0199 or pass token sk-live99887766554433221100.';
      const matches = scanTextForPII(text);
      expect(matches.length).toBe(2);
      expect(matches.some((m) => m.category === 'phone')).toBe(true);
      expect(matches.some((m) => m.category === 'password')).toBe(true);
    });
  });

  describe('Redaction Engine: Irreversible Opaque Masking', () => {
    it('replaces sensitive substrings with solid block characters', () => {
      const text = 'Email: premjeet@example.com';
      const redacted = redactTextOpaque(text, ['premjeet@example.com']);
      expect(redacted).not.toContain('premjeet@example.com');
      expect(redacted).toContain('████████████████████');
    });
  });

  describe('Privacy Gate: Strict Fail-Closed Security', () => {
    it('blocks outbound requests containing unmasked PII (Fail-Closed)', () => {
      const leakyPayload = {
        task: 'Submit form',
        sanitized_dom: [
          {
            tag: 'input',
            selector: '#email',
            label: 'Email Address',
            visible_text: 'user.personal@company.com', // Leaked raw PII!
          },
        ],
        isRedactedVerified: true,
        detectedPiiCount: 1,
      };

      const result = PrivacyGate.validateSanitizedContext(leakyPayload);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Privacy Gate Alert');
      expect(result.blockedItemsCount).toBeGreaterThan(0);
    });

    it('allows outbound requests when all PII is cleanly masked', () => {
      const sanitizedPayload = {
        task: 'Submit form',
        sanitized_dom: [
          {
            tag: 'input',
            selector: '#email',
            label: 'Email Field',
            visible_text: '[REDACTED_EMAIL_1]',
            redacted_placeholder: '[REDACTED_EMAIL_1]',
          },
        ],
        isRedactedVerified: true,
        detectedPiiCount: 1,
      };

      const result = PrivacyGate.validateSanitizedContext(sanitizedPayload);
      expect(result.allowed).toBe(true);
      expect(result.blockedItemsCount).toBe(0);
    });

    it('blocks request if redaction verification flag is missing', () => {
      const unverifiedPayload = {
        task: 'Click next',
        sanitized_dom: [],
        isRedactedVerified: false,
        detectedPiiCount: 4,
      };

      const result = PrivacyGate.validateSanitizedContext(unverifiedPayload);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Action Validator: Security & Human-in-the-Loop Policies', () => {
    it('allows benign actions like scroll and focus', () => {
      const action: ProposedAction = { type: 'scroll', direction: 'down' };
      const validation = ActionValidator.validate(action);
      expect(validation.valid).toBe(true);
      expect(validation.requiresConfirmation).toBe(false);
    });

    it('blocks malicious script injections in action values', () => {
      const maliciousAction: ProposedAction = {
        type: 'type',
        target: { selector: '#search' },
        value: '<script>alert(document.cookie)</script>',
      };
      const validation = ActionValidator.validate(maliciousAction);
      expect(validation.valid).toBe(false);
      expect(validation.violationError).toContain('Security Violation');
    });

    it('enforces viewport coordinate boundary limits', () => {
      const outOfBoundsAction: ProposedAction = {
        type: 'click',
        target: { label: 'Offscreen', x: 2500, y: 3000 },
      };
      const validation = ActionValidator.validate(outOfBoundsAction, { width: 1920, height: 1080 });
      expect(validation.valid).toBe(false);
      expect(validation.violationError).toContain('outside active viewport');
    });

    it('flags consequential actions (Submit, Delete, Purchase) for Human Confirmation', () => {
      const submitAction: ProposedAction = {
        type: 'click',
        target: { label: 'Submit Application', selector: '#submitBtn' },
      };
      const validation = ActionValidator.validate(submitAction);
      expect(validation.valid).toBe(true);
      expect(validation.requiresConfirmation).toBe(true);
      expect(validation.consequentialReason).toContain('SUBMIT');

      const deleteAction: ProposedAction = {
        type: 'click',
        target: { label: 'Delete Record', selector: '#deleteBtn' },
      };
      const delValidation = ActionValidator.validate(deleteAction);
      expect(delValidation.requiresConfirmation).toBe(true);
      expect(delValidation.consequentialReason).toContain('DELETE');
    });
  });
});
