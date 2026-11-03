"""
Unit and Integration Tests for MemoryService
Verifies:
- Note creation, retrieval, search, deletion, clearing
- ID stability, timestamp formatting, path resolution
- Sensitive credential scrubbing
- Long-term memory categories (facts, preferences, identity)
- Persistence across service restarts/reinitialization
- Corrupted JSON recovery and automatic backup creation
- Concurrent multi-threaded write safety
"""

import os
import sys
import json
import shutil
import unittest
import tempfile
import threading
from pathlib import Path

# Ensure backend package is in path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.memory_service import MemoryService


class TestMemoryService(unittest.TestCase):
    def setUp(self):
        """Use isolated temporary directory for each test."""
        self.test_dir = tempfile.mkdtemp(prefix="secxurevision_test_mem_")
        self.service = MemoryService(data_dir=Path(self.test_dir))

    def tearDown(self):
        """Clean up temporary test directory."""
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_add_and_list_notes(self):
        """Verifies adding notes with stable IDs, timestamps, and retrieval."""
        n1 = self.service.add_note("First test note")
        n2 = self.service.add_note("Second test note")

        self.assertEqual(n1["id"], 1)
        self.assertEqual(n1["text"], "First test note")
        self.assertIn("time", n1)
        self.assertIn("created_at", n1)

        self.assertEqual(n2["id"], 2)
        self.assertEqual(n2["text"], "Second test note")

        all_notes = self.service.list_notes()
        self.assertEqual(len(all_notes), 2)
        self.assertEqual(all_notes[0]["id"], 1)
        self.assertEqual(all_notes[1]["id"], 2)

    def test_empty_note_validation(self):
        """Verifies ValueError is raised for empty or whitespace notes."""
        with self.assertRaises(ValueError):
            self.service.add_note("")
        with self.assertRaises(ValueError):
            self.service.add_note("   ")

    def test_search_notes(self):
        """Verifies substring case-insensitive note search."""
        self.service.add_note("Meeting with product team at 4 PM")
        self.service.add_note("Buy groceries and milk")
        self.service.add_note("Team meeting notes review")

        results = self.service.search_notes("meeting")
        self.assertEqual(len(results), 2)

        results_milk = self.service.search_notes("MILK")
        self.assertEqual(len(results_milk), 1)
        self.assertEqual(results_milk[0]["text"], "Buy groceries and milk")

        results_none = self.service.search_notes("nonexistent")
        self.assertEqual(len(results_none), 0)

    def test_delete_note(self):
        """Verifies deleting notes by ID and handling missing IDs."""
        n1 = self.service.add_note("Note 1")
        n2 = self.service.add_note("Note 2")
        n3 = self.service.add_note("Note 3")

        # Delete note 2
        success = self.service.delete_note(n2["id"])
        self.assertTrue(success)

        remaining = self.service.list_notes()
        self.assertEqual(len(remaining), 2)
        ids = [n["id"] for n in remaining]
        self.assertIn(1, ids)
        self.assertIn(3, ids)
        self.assertNotIn(2, ids)

        # Deleting non-existent ID returns False
        self.assertFalse(self.service.delete_note(999))

    def test_clear_notes(self):
        """Verifies atomic clearing of notes."""
        self.service.add_note("Note A")
        self.service.add_note("Note B")
        self.assertEqual(len(self.service.list_notes()), 2)

        self.service.clear_notes()
        self.assertEqual(len(self.service.list_notes()), 0)

    def test_sensitive_credential_scrubbing(self):
        """Verifies passwords, API keys, and auth tokens are redacted."""
        # Google Gemini API key pattern
        raw_key_note = "User API Key: AIzaSyD987654321abcdefg0123456789ABCDE"
        saved = self.service.add_note(raw_key_note)
        self.assertNotIn("AIzaSy", saved["text"])
        self.assertIn("[REDACTED_CREDENTIAL]", saved["text"])

        # OpenAI key pattern
        sk_note = "My secret token is sk-1234567890abcdef1234567890"
        saved_sk = self.service.add_note(sk_note)
        self.assertNotIn("sk-1234567890", saved_sk["text"])
        self.assertIn("[REDACTED_CREDENTIAL]", saved_sk["text"])

    def test_memory_persistence_and_categories(self):
        """Verifies storing, retrieving, and deleting long-term memory."""
        # Set preferences
        self.service.set_memory("preferences", "language", "Hindi")
        self.service.set_memory("preferences", "voice_rate", "1.0")
        self.service.set_memory("identity", "user_title", "Developer")

        mem = self.service.get_memory()
        self.assertIn("preferences", mem)
        self.assertEqual(mem["preferences"]["language"]["value"], "Hindi")
        self.assertEqual(mem["identity"]["user_title"]["value"], "Developer")

        # Filter by category
        pref_only = self.service.get_memory(category="preferences")
        self.assertIn("preferences", pref_only)
        self.assertNotIn("identity", pref_only)

        # Search memory
        search_res = self.service.get_memory(query="Hindi")
        self.assertIn("preferences", search_res)

        # Delete specific memory key
        deleted = self.service.delete_memory("preferences", "voice_rate")
        self.assertTrue(deleted)
        self.assertNotIn("voice_rate", self.service.get_memory("preferences")["preferences"])

        # Clear category
        self.service.clear_memory(category="preferences")
        self.assertEqual(self.service.get_memory("preferences")["preferences"], {})

    def test_restart_reinitialization_persistence(self):
        """Verifies data persists across service re-initialization (simulating restart)."""
        self.service.add_note("Persistent Note Across Restart")
        self.service.set_memory("facts", "project_codename", "SecxureVision")

        # Create new service instance pointing to same directory
        restarted_service = MemoryService(data_dir=Path(self.test_dir))
        notes = restarted_service.list_notes()
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["text"], "Persistent Note Across Restart")

        mem = restarted_service.get_memory("facts")
        self.assertEqual(mem["facts"]["project_codename"]["value"], "SecxureVision")

    def test_corrupted_json_handling_and_backup(self):
        """Verifies corrupted storage files are backed up and do not crash the service."""
        notes_file = Path(self.test_dir) / "notes.json"
        notes_file.write_text("{ this is completely corrupted json !!! }", encoding="utf-8")

        # Initializing service should detect corruption, backup the file, and return empty list
        corrupt_service = MemoryService(data_dir=Path(self.test_dir))
        notes = corrupt_service.list_notes()
        self.assertEqual(notes, [])

        # Check backup file was created
        backup_files = list(Path(self.test_dir).glob("notes.json.corrupt_*.bak"))
        self.assertGreaterEqual(len(backup_files), 1)
        # Original corrupted content is preserved in backup
        self.assertIn("this is completely corrupted json", backup_files[0].read_text(encoding="utf-8"))

    def test_concurrent_multithreaded_writes(self):
        """Verifies thread-safety under concurrent writes."""
        threads = []
        errors = []

        def worker(idx):
            try:
                for i in range(10):
                    self.service.add_note(f"Worker {idx} Note {i}")
            except Exception as e:
                errors.append(e)

        for t_idx in range(5):
            t = threading.Thread(target=worker, args=(t_idx,))
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0)
        total_notes = self.service.list_notes()
        # 5 workers * 10 notes = 50 notes
        self.assertEqual(len(total_notes), 50)
        # All IDs must be unique
        all_ids = [n["id"] for n in total_notes]
        self.assertEqual(len(all_ids), len(set(all_ids)))

    def test_directive_parser_hindi_and_english(self):
        """Verifies natural language note directives in English and Hindi/Hinglish."""
        # English save note
        r1 = self.service.handle_notes_directive("Save note: Remember to review PR")
        self.assertIsNotNone(r1)
        self.assertTrue(r1["handled"])
        self.assertEqual(len(self.service.list_notes()), 1)

        # Hindi / Hinglish save note
        r2 = self.service.handle_notes_directive("Note likho kal sham 5 baje meeting hai")
        self.assertIsNotNone(r2)
        self.assertTrue(r2["handled"])
        self.assertEqual(len(self.service.list_notes()), 2)

        # Show notes
        r3 = self.service.handle_notes_directive("Show my notes")
        self.assertIsNotNone(r3)
        self.assertIn("Remember to review PR", r3["message"])

        # Hindi show notes
        r4 = self.service.handle_notes_directive("Mere notes dikhao")
        self.assertIsNotNone(r4)
        self.assertIn("Remember to review PR", r4["message"])

        # Search notes
        r5 = self.service.handle_notes_directive("Search notes for PR")
        self.assertIsNotNone(r5)
        self.assertEqual(len(r5["notes"]), 1)

        # Delete note
        r6 = self.service.handle_notes_directive("Delete note 1")
        self.assertIsNotNone(r6)
        self.assertEqual(len(self.service.list_notes()), 1)

        # Clear notes
        r7 = self.service.handle_notes_directive("Clear all notes")
        self.assertIsNotNone(r7)
        self.assertEqual(len(self.service.list_notes()), 0)


if __name__ == "__main__":
    unittest.main()
