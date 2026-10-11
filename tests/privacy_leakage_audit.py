import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_zero_leakage_audit_compliant_payload():
    """
    Test that properly sanitized client payloads pass the backend zero-leakage audit.
    """
    sanitized_payload = {
        "task": "Submit the registration form",
        "sanitized_dom": [
            {"agentId": "node_1", "tagName": "input", "placeholder": "[PERSON_NAME]", "text": "[PERSON_1]", "isClickable": False, "boundingBox": {"x": 30, "y": 155, "width": 230, "height": 36}},
            {"agentId": "node_2", "tagName": "input", "placeholder": "[EMAIL_ADDRESS]", "text": "[EMAIL_1]", "isClickable": False, "boundingBox": {"x": 280, "y": 155, "width": 230, "height": 36}},
            {"agentId": "node_3", "tagName": "input", "placeholder": "[PHONE_NUMBER]", "text": "[PHONE_1]", "isClickable": False, "boundingBox": {"x": 30, "y": 225, "width": 230, "height": 36}},
            {"agentId": "node_4", "tagName": "input", "placeholder": "[CREDIT_CARD]", "text": "[CARD_1]", "isClickable": False, "boundingBox": {"x": 280, "y": 345, "width": 230, "height": 36}},
            {"agentId": "submit_btn", "tagName": "button", "id": "submit-btn", "text": "SUBMIT REGISTRATION", "isClickable": True, "boundingBox": {"x": 360, "y": 370, "width": 150, "height": 36}}
        ],
        "redaction_telemetry": {
            "entities_redacted": 4,
            "redaction_style": "semantic",
            "entity_categories": ["name", "email", "phone", "creditCard"]
        }
    }

    response = client.post("/api/analyze", json=sanitized_payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["action"] == "click"
    assert data["target_id"] == "submit_btn"
    assert data["privacy_audit"]["raw_pii_detected_on_server"] is False
    assert data["privacy_audit"]["zero_leakage_verified"] is True
    assert data["privacy_audit"]["sanitized_tokens_found_count"] >= 4
    print("[PASS] Compliant sanitized payload passed Zero-Leakage audit with 0 raw leaks.")

def test_leakage_audit_detects_unredacted_payload():
    """
    Test that the backend correctly detects and flags if an unredacted raw payload is sent.
    """
    unsafe_payload = {
        "task": "Submit form",
        "sanitized_dom": [
            {"agentId": "node_1", "tagName": "input", "text": "prem@gmail.com", "isClickable": False},
            {"agentId": "node_2", "tagName": "input", "text": "SSN: 123-45-6789", "isClickable": False},
            {"agentId": "node_3", "tagName": "input", "text": "Card: 4532-1188-9921-3456", "isClickable": False},
            {"agentId": "btn_1", "tagName": "button", "text": "Submit", "isClickable": True}
        ]
    }

    response = client.post("/api/analyze", json=unsafe_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["privacy_audit"]["raw_pii_detected_on_server"] is True
    assert data["privacy_audit"]["zero_leakage_verified"] is False
    print("[PASS] Backend audit successfully caught and flagged unredacted raw PII violation.")

if __name__ == "__main__":
    print("=" * 60)
    print("  ZERO-LEAKAGE PRIVACY AUDIT & BACKEND VERIFICATION")
    print("=" * 60)
    test_zero_leakage_audit_compliant_payload()
    test_leakage_audit_detects_unredacted_payload()
    print("=" * 60)
    print("  ALL PRIVACY AUDIT TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
