/**
 * SECUREVISION AI - Client-Side Action Validator & Security Policy Guard
 * Ensures incoming AI action plans strictly conform to allowed browser actions,
 * remain within viewport bounds, and flags consequential actions for Human-in-the-Loop confirmation.
 */

export type AllowedActionType = 'click' | 'scroll' | 'focus' | 'navigate' | 'wait' | 'back' | 'type';

export interface ActionTarget {
  selector?: string;
  label?: string;
  x?: number;
  y?: number;
}

export interface ProposedAction {
  type: AllowedActionType;
  target?: ActionTarget;
  value?: string;
  direction?: 'up' | 'down';
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  requiresConfirmation: boolean;
  actionSummary: string;
  consequentialReason?: string;
  violationError?: string;
}

const ALLOWED_ACTIONS: Set<string> = new Set(['click', 'scroll', 'focus', 'navigate', 'wait', 'back', 'type']);

// Dangerous keywords that mandate human confirmation before execution
const CONSEQUENTIAL_KEYWORDS = [
  'submit',
  'delete',
  'remove',
  'purchase',
  'buy',
  'pay',
  'send',
  'confirm',
  'order',
  'terminate',
  'destroy',
  'checkout',
];

export class ActionValidator {
  /**
   * Validates an AI-proposed action against security rules and consequential impact
   */
  public static validate(
    action: ProposedAction,
    viewport: { width: number; height: number } = { width: 1920, height: 1080 }
  ): ValidationResult {
    // 1. Check allowed action types
    if (!ALLOWED_ACTIONS.has(action.type)) {
      return {
        valid: false,
        requiresConfirmation: false,
        actionSummary: `Unknown action: ${action.type}`,
        violationError: `Security Violation: Action type '${action.type}' is strictly disallowed by SecureVision policy.`,
      };
    }

    // 2. Reject arbitrary code execution or credential harvesting attempts
    if (action.value) {
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /eval\(/i,
        /document\.cookie/i,
        /localStorage/i,
        /window\./i,
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(action.value)) {
          return {
            valid: false,
            requiresConfirmation: false,
            actionSummary: 'Blocked Script Execution',
            violationError: 'Security Violation: Detected malicious script syntax in action payload.',
          };
        }
      }
    }

    // 3. Viewport Coordinate Bounds Check
    if (action.target?.x !== undefined && action.target?.y !== undefined) {
      if (
        action.target.x < 0 ||
        action.target.x > viewport.width ||
        action.target.y < 0 ||
        action.target.y > viewport.height
      ) {
        return {
          valid: false,
          requiresConfirmation: false,
          actionSummary: 'Out of Viewport Bounds',
          violationError: `Coordinates (${action.target.x}, ${action.target.y}) are outside active viewport (${viewport.width}x${viewport.height}).`,
        };
      }
    }

    // 4. Consequential Action Check (Human-in-the-Loop Confirmation)
    let isConsequential = false;
    let consequentialReason: string | undefined;

    const labelLower = (action.target?.label || '').toLowerCase();
    const selectorLower = (action.target?.selector || '').toLowerCase();

    for (const keyword of CONSEQUENTIAL_KEYWORDS) {
      if (labelLower.includes(keyword) || selectorLower.includes(keyword)) {
        isConsequential = true;
        consequentialReason = `Action targets consequential element '${action.target?.label || action.target?.selector}' (${keyword.toUpperCase()}). Human authorization required.`;
        break;
      }
    }

    const summary = action.type === 'click'
      ? `Click element '${action.target?.label || action.target?.selector || 'target'}'`
      : action.type === 'scroll'
      ? `Scroll page ${action.direction || 'down'}`
      : action.type === 'type'
      ? `Type masked value into ${action.target?.label || action.target?.selector}`
      : `${action.type.toUpperCase()}`;

    return {
      valid: true,
      requiresConfirmation: isConsequential,
      actionSummary: summary,
      consequentialReason,
    };
  }
}
