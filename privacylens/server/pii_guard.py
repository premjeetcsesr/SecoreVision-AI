import re
from typing import List, Tuple
from fastapi import HTTPException
from schemas import AgentStepRequest


def luhn_checksum_valid(number_str: str) -> bool:
    digits = [int(c) for c in number_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    return checksum % 10 == 0


RAW_PII_PATTERNS = [
    ("Aadhaar Number", re.compile(r"\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b")),
    ("PAN Card", re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")),
    ("Indian Mobile Number", re.compile(r"\b(?:\+?91[ -]?)?[6789]\d{9}\b")),
    ("Email Address", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("Indian IFSC Code", re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")),
    ("Indian Passport", re.compile(r"\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b")),
]


def check_for_raw_pii(text: str) -> List[Tuple[str, str]]:
    violations = []
    if not text:
        return violations

    for name, pattern in RAW_PII_PATTERNS:
        matches = pattern.findall(text)
        for match in matches:
            # Skip if it is a placeholder like [EMAIL_1] or [PHONE_1]
            if match.startswith("[") and match.endswith("]"):
                continue
            violations.append((name, match))

    # Check credit card Luhn candidates
    card_candidates = re.findall(r"\b(?:\d[ -]?){13,19}\b", text)
    for cand in card_candidates:
        clean_num = re.sub(r"\D", "", cand)
        if luhn_checksum_valid(clean_num):
            violations.append(("Credit/Debit Card (Luhn Verified)", cand))

    return violations


def validate_request_sanitization(request: AgentStepRequest):
    """
    Server-side second line of defense:
    Verifies that the incoming sanitized_dom and task payload contains ONLY
    typed placeholders (e.g., [EMAIL_1], [AADHAAR_1]) and no raw personal data.
    """
    all_violations = []

    # Check task text
    task_violations = check_for_raw_pii(request.task)
    for v_type, v_match in task_violations:
        all_violations.append(f"In task description: found raw {v_type} ('{v_match[:4]}***')")

    # Check all DOM element values and text
    for elem in request.sanitized_dom:
        texts_to_check = [
            elem.visible_text or "",
            elem.placeholder or "",
            elem.current_value or "",
        ]
        combined = " ".join(texts_to_check)
        dom_violations = check_for_raw_pii(combined)
        for v_type, v_match in dom_violations:
            all_violations.append(
                f"In element '{elem.selector}': found raw {v_type} ('{v_match[:4]}***')"
            )

    if all_violations:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "PII_LEAKAGE_DETECTED",
                "message": "Server safety guard rejected request: unredacted raw personal/financial data was detected in the payload.",
                "violations": all_violations,
                "remediation": "Ensure all client-side regex and DOM redactions are applied before network transmission.",
            },
        )
