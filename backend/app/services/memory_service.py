"""
Persistent Notes & Long-Term Memory Service
Thread-safe, atomic disk storage for notes (notes.json) and user memory (memory.json).
Includes security scrubbing to prevent saving API keys, tokens, or passwords.
"""

import os
import re
import json
import time
import shutil
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("securevision-ai.memory")

# Base backend directory: backend/
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DATA_DIR = BACKEND_ROOT / "data"

# Sensitive pattern regexes to prevent accidental credential storage
SENSITIVE_PATTERNS = [
    # Google API Keys (AIzaSy... and modern AQ.Ab...)
    re.compile(r"AIza[0-9A-Za-z-_]{35}"),
    re.compile(r"AQ\.[0-9A-Za-z-_]{30,}"),
    # Generic API Keys / Bearer Tokens
    re.compile(r"(?:bearer\s+|token[:=]\s*|key[:=]\s*)[a-zA-Z0-9_\-\.]{20,}", re.IGNORECASE),
    # OpenAI/Anthropic-like keys
    re.compile(r"(?:sk-[a-zA-Z0-9]{20,})"),
    # JWTs
    re.compile(r"ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    # Passwords in text (e.g. password is secret123, pass: xyz)
    re.compile(r"(?:password|passwd|pwd)\s*(?:is|[:=])\s*([^\s,;]+)", re.IGNORECASE)
]


class MemoryService:
    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = Path(data_dir) if data_dir else DEFAULT_DATA_DIR
        self.notes_file = self.data_dir / "notes.json"
        self.memory_file = self.data_dir / "memory.json"
        self._lock = threading.RLock()
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        """Creates data directory and initial JSON files safely if absent."""
        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            if not self.notes_file.exists():
                self._atomic_write(self.notes_file, [])
            if not self.memory_file.exists():
                self._atomic_write(self.memory_file, self._default_memory())
        except Exception as e:
            logger.error(f"Error ensuring storage in {self.data_dir}: {e}")

    @staticmethod
    def _default_memory() -> Dict[str, Any]:
        return {
            "identity": {},
            "preferences": {},
            "facts": {},
            "projects": {},
            "relationships": {}
        }

    def _scrub_sensitive_data(self, text: str) -> str:
        """Redacts sensitive credentials, API keys, and passwords from input text."""
        if not text or not isinstance(text, str):
            return text
        scrubbed = text
        for pattern in SENSITIVE_PATTERNS:
            scrubbed = pattern.sub("[REDACTED_CREDENTIAL]", scrubbed)
        return scrubbed

    def _atomic_write(self, target_path: Path, data: Any) -> None:
        """
        Safely writes data to target_path using an atomic temp-file replace.
        Ensures partial writes or unexpected crashes never corrupt storage.
        """
        temp_path = target_path.parent / f".tmp_{target_path.name}_{os.getpid()}_{threading.get_ident()}_{time.time_ns()}"
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.flush()
                os.fsync(f.fileno())
            # Atomic replace
            os.replace(temp_path, target_path)
        except Exception as e:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            logger.error(f"Atomic write failed for {target_path}: {e}")
            raise IOError(f"Failed to write storage file {target_path.name}: {e}")

    def _load_notes_file(self) -> List[Dict[str, Any]]:
        """
        Loads notes from notes.json with corruption defense.
        Never silently overwrites corrupted files; creates a backup copy.
        """
        if not self.notes_file.exists():
            return []

        try:
            content = self.notes_file.read_text(encoding="utf-8").strip()
            if not content:
                return []
            data = json.loads(content)
            if isinstance(data, list):
                return data
            # If structure is unexpected, back up and reset
            self._backup_corrupted_file(self.notes_file, "unexpected_type")
            return []
        except Exception as e:
            logger.warning(f"Corrupted notes file detected: {e}. Preserving backup.")
            self._backup_corrupted_file(self.notes_file, "parse_error")
            return []

    def _load_memory_file(self) -> Dict[str, Any]:
        """
        Loads memory from memory.json with corruption defense.
        """
        base = self._default_memory()
        if not self.memory_file.exists():
            return base

        try:
            content = self.memory_file.read_text(encoding="utf-8").strip()
            if not content:
                return base
            data = json.loads(content)
            if isinstance(data, dict):
                for k in base:
                    if k not in data or not isinstance(data[k], dict):
                        data[k] = {}
                return data
            self._backup_corrupted_file(self.memory_file, "unexpected_type")
            return base
        except Exception as e:
            logger.warning(f"Corrupted memory file detected: {e}. Preserving backup.")
            self._backup_corrupted_file(self.memory_file, "parse_error")
            return base

    def _backup_corrupted_file(self, target_path: Path, reason: str) -> None:
        """Creates a timestamped backup of corrupted file for forensic safety."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = target_path.parent / f"{target_path.name}.corrupt_{timestamp}_{reason}.bak"
            shutil.copy2(target_path, backup_path)
            logger.info(f"Saved corrupted storage backup to {backup_path}")
        except Exception as e:
            logger.error(f"Could not create backup of corrupted file {target_path}: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # NOTES OPERATIONS
    # ─────────────────────────────────────────────────────────────────────────

    def add_note(self, text: str) -> Dict[str, Any]:
        """Adds a new persistent note with stable ID, timestamp, and scrubbed text."""
        cleaned_text = (text or "").strip()
        if not cleaned_text:
            raise ValueError("Note text cannot be empty.")

        scrubbed = self._scrub_sensitive_data(cleaned_text)

        with self._lock:
            notes = self._load_notes_file()
            # Calculate next stable sequential ID
            existing_ids = [n.get("id") for n in notes if isinstance(n.get("id"), int)]
            next_id = (max(existing_ids) + 1) if existing_ids else 1

            now = datetime.now()
            note_item = {
                "id": next_id,
                "text": scrubbed,
                "time": now.strftime("%H:%M:%S"),
                "created_at": now.isoformat()
            }
            notes.append(note_item)
            self._atomic_write(self.notes_file, notes)
            return note_item

    def list_notes(self, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists all notes, optionally filtered by a search query."""
        with self._lock:
            notes = self._load_notes_file()
            if not query or not query.strip():
                return list(notes)

            q = query.strip().lower()
            return [n for n in notes if q in str(n.get("text", "")).lower()]

    def search_notes(self, query: str) -> List[Dict[str, Any]]:
        """Search notes by substring keyword."""
        return self.list_notes(query=query)

    def delete_note(self, note_id: Any) -> bool:
        """Deletes a note by its integer or string ID."""
        with self._lock:
            notes = self._load_notes_file()
            init_len = len(notes)

            # Match either int or string representation
            id_str = str(note_id).strip()
            updated = [n for n in notes if str(n.get("id")) != id_str]

            if len(updated) < init_len:
                self._atomic_write(self.notes_file, updated)
                return True
            return False

    def clear_notes(self) -> bool:
        """Clears all notes atomically."""
        with self._lock:
            self._atomic_write(self.notes_file, [])
            return True

    # ─────────────────────────────────────────────────────────────────────────
    # USER MEMORY OPERATIONS
    # ─────────────────────────────────────────────────────────────────────────

    def set_memory(self, category: str, key: str, value: Any) -> Dict[str, Any]:
        """
        Stores a user preference or fact into long-term memory under a category.
        Categories: identity, preferences, facts, projects, relationships.
        """
        cat = (category or "facts").strip().lower()
        k = (key or "").strip()
        if not k:
            raise ValueError("Memory key cannot be empty.")

        val_str = str(value).strip() if value is not None else ""
        scrubbed_val = self._scrub_sensitive_data(val_str)

        with self._lock:
            memory = self._load_memory_file()
            if cat not in memory or not isinstance(memory[cat], dict):
                memory[cat] = {}

            memory[cat][k] = {
                "value": scrubbed_val,
                "updated_at": datetime.now().isoformat()
            }
            self._atomic_write(self.memory_file, memory)
            return memory

    def get_memory(self, category: Optional[str] = None, query: Optional[str] = None) -> Dict[str, Any]:
        """Retrieves memory, optionally filtered by category and query."""
        with self._lock:
            memory = self._load_memory_file()
            if category:
                cat = category.strip().lower()
                data = {cat: memory.get(cat, {})}
            else:
                data = memory

            if not query or not query.strip():
                return data

            q = query.strip().lower()
            filtered: Dict[str, Any] = {}
            for c, items in data.items():
                matching_items = {}
                for k, v in items.items():
                    val_text = v.get("value", "") if isinstance(v, dict) else str(v)
                    if q in k.lower() or q in val_text.lower():
                        matching_items[k] = v
                if matching_items:
                    filtered[c] = matching_items
            return filtered

    def delete_memory(self, category: str, key: str) -> bool:
        """Deletes a specific memory entry."""
        cat = (category or "").strip().lower()
        k = (key or "").strip()
        with self._lock:
            memory = self._load_memory_file()
            if cat in memory and isinstance(memory[cat], dict) and k in memory[cat]:
                del memory[cat][k]
                self._atomic_write(self.memory_file, memory)
                return True
            return False

    def clear_memory(self, category: Optional[str] = None) -> bool:
        """Clears memory for a specific category or resets all memory."""
        with self._lock:
            memory = self._load_memory_file()
            if category:
                cat = category.strip().lower()
                if cat in memory:
                    memory[cat] = {}
            else:
                memory = self._default_memory()

            self._atomic_write(self.memory_file, memory)
            return True

    # ─────────────────────────────────────────────────────────────────────────
    # DIRECTIVES PARSER (Bilingual Hindi, English, Hinglish)
    # ─────────────────────────────────────────────────────────────────────────

    def handle_notes_directive(self, prompt: str) -> Optional[Dict[str, Any]]:
        """
        Parses common note commands in English, Hindi, and Hinglish.
        Returns a structured response if handled, or None if it's not a note directive.
        """
        p = (prompt or "").strip().lower()

        # 1. Clear notes (e.g. "clear all notes", "saare notes delete karo")
        if re.search(r"^(?:clear\s+(?:all\s+)?notes|delete\s+all\s+notes|saare\s+notes\s+(?:delete|hata|clear)\s*karo)", p):
            self.clear_notes()
            return {
                "handled": True,
                "message": "All notes have been cleared.",
                "notes": []
            }

        # 2. Add note (e.g. "save note: X", "note: X", "note banao: X", "note likho X")
        add_match = re.search(r"^(?:save\s+note|add\s+note|note\s+banao|note\s+likho|likho\s+note|remember\s+note|note)(?:\s*[:\-]\s*|\s+)(.+)$", prompt.strip(), re.IGNORECASE)
        if add_match:
            note_content = add_match.group(1).strip()
            # Guard against queries like "notes dikhao"
            if not re.search(r"^(?:dikhao|batao|search|karo|list|show|view|find)", note_content, re.IGNORECASE):
                created = self.add_note(note_content)
                return {
                    "handled": True,
                    "message": f"Note #{created['id']} saved: \"{created['text']}\"",
                    "note": created,
                    "notes": self.list_notes()
                }

        # 3. Delete note by ID (e.g. "delete note 2", "note 2 delete karo", "remove note 3")
        del_match = re.search(r"(?:delete\s+note|remove\s+note|note)\s+(\d+)(?:\s*(?:delete|hatao|karo))?", p)
        if del_match and ("delete" in p or "remove" in p or "hata" in p):
            nid = int(del_match.group(1))
            deleted = self.delete_note(nid)
            if deleted:
                return {
                    "handled": True,
                    "message": f"Note #{nid} successfully deleted.",
                    "notes": self.list_notes()
                }
            else:
                return {
                    "handled": True,
                    "message": f"Note #{nid} not found.",
                    "notes": self.list_notes()
                }

        # 4. Search notes (e.g. "search notes for DBMS", "notes me search karo DBMS")
        search_match = re.search(r"(?:search\s+(?:notes\s+for|in\s+notes\s+for|notes)|notes\s+me\s+search\s+karo)\s+([^\.]+)", p)
        if search_match:
            query = search_match.group(1).strip()
            results = self.search_notes(query)
            if results:
                items_str = "\n".join([f"• [{n['id']}] {n['text']} ({n['time']})" for n in results])
                return {
                    "handled": True,
                    "message": f"Found {len(results)} note(s) for '{query}':\n{items_str}",
                    "notes": results
                }
            else:
                return {
                    "handled": True,
                    "message": f"No notes found matching '{query}'.",
                    "notes": []
                }

        # 5. Show / list notes (e.g. "show notes", "show my notes", "mere notes dikhao", "notes batao")
        if re.search(r"^(?:show|list|view|get)?\s*(?:my\s+)?notes\b|mere\s+notes\s+(?:dikhao|batao)|notes\s+(?:dikhao|batao|list)", p):
            notes = self.list_notes()
            if not notes:
                return {
                    "handled": True,
                    "message": "Aapke paas abhi koi saved notes nahi hain. Aap 'Save note: [text]' kehkar note save kar sakte hain.",
                    "notes": []
                }
            items_str = "\n".join([f"• [{n['id']}] {n['text']} ({n['time']})" for n in notes])
            return {
                "handled": True,
                "message": f"Saved Notes ({len(notes)}):\n{items_str}",
                "notes": notes
            }

        return None


# Global singleton instance
memory_service = MemoryService()
