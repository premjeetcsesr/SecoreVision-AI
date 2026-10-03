import asyncio
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["provider"] in ["gemini", "mock"]
    assert data["pii_guard_active"] is True
    print("[PASS] Health check passed!")


def test_cors_allows_configured_frontend():
    res = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_rejects_unconfigured_origin():
    res = client.get("/api/health", headers={"Origin": "https://untrusted.example"})
    assert res.status_code == 200
    assert "access-control-allow-origin" not in res.headers


def test_sanitized_agent_step():
    payload = {
        "task": "Fill out personal details and submit form",
        "redaction_scheme_version": "1.0",
        "sanitized_dom": [
            {
                "tag": "input",
                "id": "full_name",
                "name": "full_name",
                "type": "text",
                "placeholder": "Enter full name",
                "selector": "#full_name",
                "redacted_placeholder": "[NAME_1]"
            },
            {
                "tag": "input",
                "id": "email",
                "name": "email",
                "type": "email",
                "placeholder": "Enter email address",
                "selector": "#email",
                "redacted_placeholder": "[EMAIL_1]"
            },
            {
                "tag": "button",
                "id": "btn-submit",
                "type": "submit",
                "visible_text": "Submit Application",
                "selector": "#btn-submit"
            }
        ],
        "history": []
    }
    res = client.post("/api/agent/step", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["action"] == "type"
    assert data["selector"] == "#full_name"
    assert data["value"] == "[NAME_1]"
    print("[PASS] Sanitized agent step passed with typed placeholder output!")

def test_raw_pii_rejection_guard():
    leaky_payload = {
        "task": "Fill form with Rahul Sharma's Aadhaar 3849 2011 8829",
        "redaction_scheme_version": "1.0",
        "sanitized_dom": [
            {
                "tag": "input",
                "selector": "#aadhaar",
                "visible_text": "Aadhaar: 3849 2011 8829",
                "placeholder": "Aadhaar"
            }
        ],
        "history": []
    }
    res = client.post("/api/agent/step", json=leaky_payload)
    assert res.status_code == 400
    err = res.json()
    assert err["detail"]["error"] == "PII_LEAKAGE_DETECTED"
    print("[PASS] Server PII Guard successfully rejected unredacted raw PII with HTTP 400!")

if __name__ == "__main__":
    print("Running PrivacyLens Backend Test Suite...")
    test_health()
    test_cors_allows_configured_frontend()
    test_cors_rejects_unconfigured_origin()
    test_sanitized_agent_step()
    test_raw_pii_rejection_guard()
    print("ALL BACKEND TESTS PASSED SUCCESSFULLY! [OK]")
