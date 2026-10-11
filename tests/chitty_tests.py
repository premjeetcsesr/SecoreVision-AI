"""
Automated Test Suite for Chitty Voice & Command Assistant
Verifies:
1. Natural language command interpretation (English & Hindi)
2. All action types (OPEN_URL, SEARCH_WEB, CLICK_ELEMENT, TYPE_TEXT, SCROLL_PAGE, READ_PAGE, SUMMARIZE_PAGE, STOP_SPEECH)
3. Ambiguous and invalid command handling
4. Domain allowlist policy enforcement
5. Sensitive action confirmation and permission checks
6. Zero-Leakage Privacy Audit integration
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.ai.chitty_interpreter import (
    ChittyCommandInterpreter,
    ACTION_OPEN_URL,
    ACTION_SEARCH_WEB,
    ACTION_CLICK_ELEMENT,
    ACTION_TYPE_TEXT,
    ACTION_SCROLL_PAGE,
    ACTION_READ_PAGE,
    ACTION_SUMMARIZE_PAGE,
    ACTION_STOP_SPEECH,
    ACTION_STOP_ACTION,
    ACTION_CLARIFY
)
from backend.api.analyze import audit_zero_leakage, SanitizedRequest

class TestChittyCommandInterpreter(unittest.TestCase):
    def setUp(self):
        self.interpreter = ChittyCommandInterpreter()
        # Mock DOM with both safe and sensitive elements
        self.sample_dom = [
            {"id": "name-field", "tagName": "input", "placeholder": "Full Name", "text": "[PERSON_NAME]"},
            {"id": "email-field", "tagName": "input", "placeholder": "Email Address", "text": "[EMAIL]"},
            {"id": "pwd-field", "tagName": "input", "type": "password", "placeholder": "Password", "text": "[PWD]"},
            {"id": "card-field", "tagName": "input", "id": "credit-card-num", "placeholder": "Credit Card", "text": "[CARD]"},
            {"id": "submit-btn", "tagName": "button", "text": "SUBMIT REGISTRATION", "isClickable": True},
            {"id": "next-btn", "tagName": "button", "text": "Next Step", "isClickable": True}
        ]
        self.page_context = {
            "title": "Employee Registration Portal",
            "url": "http://127.0.0.1:8000/demo/form.html"
        }

    # 1. English Command Tests
    def test_open_url_english(self):
        action = self.interpreter.interpret("Open example.com", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_OPEN_URL)
        self.assertIn("example.com", action.target)

    def test_search_web_english(self):
        action = self.interpreter.interpret("Search for artificial intelligence", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_SEARCH_WEB)
        self.assertIn("artificial+intelligence", action.target)

    def test_scroll_page_english(self):
        action_down = self.interpreter.interpret("Scroll down", self.page_context, self.sample_dom)
        self.assertEqual(action_down.action, ACTION_SCROLL_PAGE)
        self.assertGreater(action_down.value, 0)

        action_up = self.interpreter.interpret("Scroll up", self.page_context, self.sample_dom)
        self.assertEqual(action_up.action, ACTION_SCROLL_PAGE)
        self.assertLess(action_up.value, 0)

    def test_summarize_page_english(self):
        action = self.interpreter.interpret("Summarize this page", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_SUMMARIZE_PAGE)
        self.assertIn("Employee Registration Portal", action.speech_response)

    def test_read_page_english(self):
        action = self.interpreter.interpret("Read this page aloud", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_READ_PAGE)
        self.assertTrue(len(action.speech_response) > 0)

    def test_stop_speech_english(self):
        action = self.interpreter.interpret("Stop speaking", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_STOP_SPEECH)

    def test_stop_action_english(self):
        action = self.interpreter.interpret("Stop action", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_STOP_ACTION)

    # 2. Hindi Command Tests
    def test_hindi_open_url(self):
        action = self.interpreter.interpret("example.com kholo", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_OPEN_URL)
        self.assertIn("example.com", action.target)

    def test_hindi_search(self):
        action = self.interpreter.interpret("Quantum computing search karo", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_SEARCH_WEB)
        self.assertIn("Quantum", action.target)

    def test_hindi_scroll(self):
        action = self.interpreter.interpret("Niche scroll karo", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_SCROLL_PAGE)
        self.assertGreater(action.value, 0)

    def test_hindi_summarize(self):
        action = self.interpreter.interpret("Is page ka summary batao", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_SUMMARIZE_PAGE)

    def test_hindi_barge_in(self):
        action = self.interpreter.interpret("Bolna band karo", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_STOP_SPEECH)

    # 3. Ambiguity & Clarification Tests
    def test_ambiguous_command(self):
        action = self.interpreter.interpret("Click it", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_CLARIFY)
        self.assertIsNotNone(action.clarification_prompt)

    def test_empty_command(self):
        action = self.interpreter.interpret("", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_CLARIFY)

    # 4. Domain Allowlist Enforcement Tests
    def test_domain_allowlist_allowed(self):
        self.interpreter.allowlist = ["example.com", "*.example.com", "127.0.0.1"]
        self.assertTrue(self.interpreter.is_domain_allowed("https://example.com"))
        self.assertTrue(self.interpreter.is_domain_allowed("https://sub.example.com"))
        self.assertTrue(self.interpreter.is_domain_allowed("http://127.0.0.1:8000"))

    def test_domain_allowlist_blocked(self):
        self.interpreter.allowlist = ["example.com", "127.0.0.1"]
        self.assertFalse(self.interpreter.is_domain_allowed("https://malicious-unverified-site.xyz"))
        action = self.interpreter.interpret("Open https://malicious-unverified-site.xyz", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_CLARIFY)
        self.assertIn("blocked", action.speech_response.lower())

    # 5. Safety & Sensitive Permission Confirmation Tests
    def test_sensitive_form_submission_requires_confirmation(self):
        # The DOM contains password & card fields, submitting form should require confirmation
        action = self.interpreter.interpret("Submit the registration form", self.page_context, self.sample_dom)
        self.assertEqual(action.action, ACTION_CLICK_ELEMENT)
        self.assertTrue(action.requires_confirmation)
        self.assertTrue(action.is_sensitive)
        self.assertIsNotNone(action.confirmation_message)

    def test_safe_navigation_does_not_require_confirmation(self):
        action = self.interpreter.interpret("Scroll down", self.page_context, self.sample_dom)
        self.assertFalse(action.requires_confirmation)
        self.assertFalse(action.is_sensitive)

    # 6. Privacy & Zero-Leakage Audit
    def test_zero_leakage_audit_clean(self):
        req = SanitizedRequest(
            task="Submit registration form",
            sanitized_dom=[{"id": "email", "text": "[EMAIL]"}],
            redaction_telemetry={"entities_redacted": 1, "entity_categories": ["email"]}
        )
        report = audit_zero_leakage(req)
        self.assertTrue(report["zero_leakage_verified"])
        self.assertFalse(report["raw_pii_detected_on_server"])

    def test_zero_leakage_audit_detects_raw_leak(self):
        req = SanitizedRequest(
            task="Submit form",
            sanitized_dom=[{"id": "email", "text": "john.doe@secretcompany.com"}]
        )
        report = audit_zero_leakage(req)
        self.assertFalse(report["zero_leakage_verified"])
        self.assertTrue(report["raw_pii_detected_on_server"])

if __name__ == "__main__":
    unittest.main()
