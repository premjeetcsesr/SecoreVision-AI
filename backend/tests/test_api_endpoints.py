"""
API Integration Tests for SecxureVision AI
Tests:
- /api/jarvis/notes GET, POST (add, search, clear, delete), DELETE by ID
- /api/jarvis/memory GET, POST, DELETE
- /ask directive integration for notes
- Baseline routes (/health, /api/config, /) to guarantee zero regressions
"""

import sys
import unittest
import tempfile
import shutil
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import httpx
from app.main import app
from app.services.memory_service import MemoryService, memory_service
import app.routers.memory as memory_router_module
import app.routers.ai as ai_router_module


class TestApiEndpoints(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        """Configure isolated test storage for the app."""
        self.test_dir = tempfile.mkdtemp(prefix="secxurevision_api_test_")
        self.test_memory_service = MemoryService(data_dir=Path(self.test_dir))

        # Patch global memory_service in routers
        self.orig_service_in_mem_router = memory_router_module.memory_service
        self.orig_service_in_ai_router = ai_router_module.memory_service
        memory_router_module.memory_service = self.test_memory_service
        ai_router_module.memory_service = self.test_memory_service

        # Create AsyncClient using ASGITransport
        transport = httpx.ASGITransport(app=app)
        self.client = httpx.AsyncClient(transport=transport, base_url="http://testserver")

    async def asyncTearDown(self):
        """Restore original service and cleanup temp files."""
        memory_router_module.memory_service = self.orig_service_in_mem_router
        ai_router_module.memory_service = self.orig_service_in_ai_router
        await self.client.aclose()
        shutil.rmtree(self.test_dir, ignore_errors=True)

    async def test_baseline_routes_preserved(self):
        """Verifies baseline endpoints (/health, /, /api/config) are working."""
        res_root = await self.client.get("/")
        self.assertEqual(res_root.status_code, 200)
        self.assertEqual(res_root.json()["service"], "SecureVision AI Backend")

        res_health = await self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json()["status"], "ok")

        res_config = await self.client.get("/api/config")
        self.assertEqual(res_config.status_code, 200)
        self.assertEqual(res_config.json()["status"], "ok")

    async def test_notes_crud_api(self):
        """Verifies full CRUD lifecycle for notes API."""
        # 1. Initially empty
        res_empty = await self.client.get("/api/jarvis/notes")
        self.assertEqual(res_empty.status_code, 200)
        self.assertEqual(res_empty.json()["notes"], [])

        # 2. Add note
        res_add = await self.client.post("/api/jarvis/notes", json={
            "action": "add",
            "note": "Verify privacy shield status"
        })
        self.assertEqual(res_add.status_code, 200)
        body = res_add.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["note"]["id"], 1)
        self.assertEqual(body["note"]["text"], "Verify privacy shield status")
        self.assertEqual(len(body["notes"]), 1)

        # 3. Add second note
        await self.client.post("/api/jarvis/notes", json={"note": "Second note for testing"})

        # 4. List notes with search query
        res_search = await self.client.get("/api/jarvis/notes?q=privacy")
        self.assertEqual(res_search.status_code, 200)
        search_body = res_search.json()
        self.assertEqual(len(search_body["notes"]), 1)
        self.assertEqual(search_body["notes"][0]["id"], 1)

        # 5. Delete note by ID
        res_del = await self.client.delete("/api/jarvis/notes/1")
        self.assertEqual(res_del.status_code, 200)
        del_body = res_del.json()
        self.assertEqual(len(del_body["notes"]), 1)
        self.assertEqual(del_body["notes"][0]["id"], 2)

        # 6. Delete non-existent note returns 404
        res_del_404 = await self.client.delete("/api/jarvis/notes/999")
        self.assertEqual(res_del_404.status_code, 404)

        # 7. Clear all notes
        res_clear = await self.client.post("/api/jarvis/notes", json={"action": "clear"})
        self.assertEqual(res_clear.status_code, 200)
        self.assertEqual(res_clear.json()["notes"], [])

    async def test_notes_input_validation(self):
        """Verifies input validation on note creation."""
        res = await self.client.post("/api/jarvis/notes", json={"action": "add", "note": ""})
        self.assertEqual(res.status_code, 400)

    async def test_memory_crud_api(self):
        """Verifies full CRUD lifecycle for long-term memory API."""
        # 1. Set memory
        res_set = await self.client.post("/api/jarvis/memory", json={
            "action": "set",
            "category": "preferences",
            "key": "theme",
            "value": "dark"
        })
        self.assertEqual(res_set.status_code, 200)

        # 2. Get memory
        res_get = await self.client.get("/api/jarvis/memory?category=preferences")
        self.assertEqual(res_get.status_code, 200)
        mem = res_get.json()["memory"]
        self.assertEqual(mem["preferences"]["theme"]["value"], "dark")

        # 3. Delete memory key
        res_del = await self.client.delete("/api/jarvis/memory/preferences/theme")
        self.assertEqual(res_del.status_code, 200)

        # 4. Delete non-existent key returns 404
        res_del_404 = await self.client.delete("/api/jarvis/memory/preferences/nonexistent")
        self.assertEqual(res_del_404.status_code, 404)

    async def test_ask_directive_handles_notes_locally(self):
        """Verifies that user directives for notes are handled locally without requiring Gemini API."""
        # Save note directive
        res_save = await self.client.post("/ask", json={
            "prompt": "Save note: Buy USB-C cable"
        })
        self.assertEqual(res_save.status_code, 200)
        body = res_save.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["source"], "local-memory")
        self.assertIn("Buy USB-C cable", body["response"])

        # Show notes directive
        res_show = await self.client.post("/ask", json={
            "prompt": "Show my notes"
        })
        self.assertEqual(res_show.status_code, 200)
        show_body = res_show.json()
        self.assertIn("Buy USB-C cable", show_body["response"])


if __name__ == "__main__":
    unittest.main()
