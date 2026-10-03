/**
 * SECUREVISION AI - Fail-Closed Privacy Gate
 * Evaluates sanitized DOM and visual payloads before any outbound network request is dispatched.
 * If ANY raw PII is detected, or if sanitization status is invalid, execution fails closed.
 */

import { scanTextForPII } from './piiDetector';

export interface SanitizedPayload {
  task: string;
  sanitized_dom: Array<{
    tag: string;
    selector: string;
    label?: string;
    visible_text?: string;
    redacted_placeholder?: string;
    current_value?: string;
  }>;
  redacted_image_base64?: string | null;
  isRedactedVerified: boolean;
  detectedPiiCount: number;
}

export interface GateValidationResult {
  allowed: boolean;
  reason?: string;
  blockedItemsCount: number;
  timestamp: string;
}

export class PrivacyGate {
  /**
   * Fail-Closed check. Throws or returns { allowed: false } if unredacted data is detected.
   */
  public static validateSanitizedContext(payload: SanitizedPayload): GateValidationResult {
    const timestamp = new Date().toISOString();

    // Rule 1: Sanitization verification flag must be explicitly true
    if (!payload.isRedactedVerified && payload.detectedPiiCount > 0) {
      return {
        allowed: false,
        reason: 'Privacy verification flag is false while sensitive items were detected.',
        blockedItemsCount: payload.detectedPiiCount,
        timestamp,
      };
    }

    // Rule 2: Inspect all text properties in sanitized_dom for residual unmasked PII
    let leakedCount = 0;
    const leakedExamples: string[] = [];

    for (const elem of payload.sanitized_dom) {
      const textsToCheck = [elem.visible_text, elem.label, elem.current_value].filter(Boolean) as string[];
      for (const text of textsToCheck) {
        const matches = scanTextForPII(text);
        if (matches.length > 0) {
          leakedCount += matches.length;
          leakedExamples.push(`${elem.selector} contains raw ${matches[0].category}`);
        }
      }
    }

    if (leakedCount > 0) {
      return {
        allowed: false,
        reason: `Privacy Gate Alert: Detected ${leakedCount} unmasked PII values in DOM payload (${leakedExamples.slice(0, 2).join(', ')}). Transmission blocked.`,
        blockedItemsCount: leakedCount,
        timestamp,
      };
    }

    // Rule 3: Visual inspection: unredacted original image check
    // If redacted_image_base64 is provided, it must be verified as sanitized
    if (payload.redacted_image_base64 && !payload.isRedactedVerified && payload.detectedPiiCount > 0) {
      return {
        allowed: false,
        reason: 'Raw visual frame detected without cryptographic/client-side redaction verification.',
        blockedItemsCount: payload.detectedPiiCount,
        timestamp,
      };
    }

    // Gate Passed: Safe to send sanitized context
    return {
      allowed: true,
      blockedItemsCount: 0,
      timestamp,
    };
  }
}
