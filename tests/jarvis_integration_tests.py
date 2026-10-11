"""
Integration tests for Jarvis backend features in Privacy-Preserving Vision Agent.
Validates Playwright browser automation, tool execution, STT/TTS endpoints, and Chitty commands.
"""

import os
import sys
import unittest
import asyncio

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend.ai.tools import execute_tool, TOOL_DEFINITIONS
from backend.browser.agent_browser import agent_browser

class TestJarvisBackendIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_and_config_endpoints(self):
        """Verify unified health and configuration endpoints."""
        health_resp = self.client.get("/api/health")
        self.assertEqual(health_resp.status_code, 200)
        hdata = health_resp.json()
        self.assertEqual(hdata.get("status"), "healthy")
        self.assertIn("playwright-browser", hdata.get("features", []))

        config_resp = self.client.get("/api/config")
        self.assertEqual(config_resp.status_code, 200)
        cdata = config_resp.json()
        self.assertEqual(cdata.get("assistant"), "Chitty")
        allowlist = cdata.get("browserAllowlist", [])
        self.assertTrue("*" in allowlist or "localhost" in allowlist)

    def test_02_browser_status_and_tabs(self):
        """Verify browser status and tab operations."""
        status_resp = self.client.get("/api/browser/status")
        self.assertEqual(status_resp.status_code, 200)

        # Create tab
        tab_resp = self.client.post("/api/browser/tabs/new", json={"url": "https://example.com"})
        self.assertEqual(tab_resp.status_code, 200)
        self.assertTrue(tab_resp.json().get("success"))

        # Close tab
        close_resp = self.client.post("/api/browser/tabs/close")
        self.assertEqual(close_resp.status_code, 200)
        self.assertTrue(close_resp.json().get("success"))

    def test_03_browser_screenshot(self):
        """Verify screenshot endpoint returns JPEG image bytes."""
        resp = self.client.get("/api/browser/screenshot")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("content-type"), "image/jpeg")
        self.assertGreater(len(resp.content), 0)

    def test_04_audio_endpoints(self):
        """Verify STT and TTS proxy endpoints."""
        # TTS
        tts_resp = self.client.post("/api/tts", json={"text": "Welcome to Chitty assistant"})
        self.assertEqual(tts_resp.status_code, 200)

        # STT
        stt_resp = self.client.post("/api/transcribe", content=b"fake_audio_bytes")
        self.assertEqual(stt_resp.status_code, 200)
        self.assertIn("status", stt_resp.json())

    def test_05_tool_definitions(self):
        """Verify tool schema definitions match expected OpenAI tool format."""
        names = [t["function"]["name"] for t in TOOL_DEFINITIONS]
        self.assertIn("get_time", names)
        self.assertIn("calculator", names)
        self.assertIn("list_files", names)
        self.assertIn("read_file", names)
        self.assertIn("write_file", names)
        self.assertIn("browser_open", names)
        self.assertIn("browser_snapshot", names)

    def test_06_tool_execution(self):
        """Verify safe execution of tools."""
        async def run_tools():
            # Calculator
            calc_res = await execute_tool("calculator", {"expression": "25 * 4 + 10"})
            self.assertEqual(calc_res, "110")

            # Time
            time_res = await execute_tool("get_time", {})
            self.assertTrue(len(time_res) > 5)

            # Write and Read file in sandbox
            await execute_tool("write_file", {"path": "test_agent.txt", "content": "Hello Chitty Agent"})
            read_res = await execute_tool("read_file", {"path": "test_agent.txt"})
            self.assertIn("Hello Chitty Agent", read_res)

        asyncio.run(run_tools())

    def test_07_chitty_command_open_example(self):
        """Verify Chitty command interpreter parses 'Open example.com' accurately."""
        resp = self.client.post("/api/chitty/command", json={"command": "Open example.com"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        action = data.get("action", {})
        self.assertEqual(action.get("action"), "OPEN_URL")
        self.assertEqual(action.get("target"), "https://example.com")
        self.assertIn("Opening", action.get("speech_response", ""))

    def test_08_browser_allowlist_enforcement(self):
        """Verify that blocked domains cannot be opened when restricted."""
        async def run_allowlist():
            agent_browser.allowlist = ["example.com", "127.0.0.1"]
            with self.assertRaises(PermissionError):
                await agent_browser.open("https://blocked-site.xyz")

        asyncio.run(run_allowlist())

if __name__ == "__main__":
    unittest.main()
