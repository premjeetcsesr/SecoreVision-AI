"""
Application Configuration & Dynamic Settings
Supports environment variables, persistence via settings.json,
and real-time updates from the Extension UI (API Key, Assistant Name).
"""

import os
import json
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_FILE = BASE_DIR / "settings.json"

# Default fallback values
DEFAULT_ASSISTANT_NAME = os.getenv("ASSISTANT_NAME", "SecureVision AI")
DEFAULT_HOST = os.getenv("HOST", "127.0.0.1")
DEFAULT_PORT = int(os.getenv("PORT", "8000"))
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

class AppConfig:
    def __init__(self):
        self.host: str = DEFAULT_HOST
        self.port: int = DEFAULT_PORT
        self.assistant_name: str = DEFAULT_ASSISTANT_NAME
        self.gemini_model: str = DEFAULT_GEMINI_MODEL
        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        self.cors_origins: List[str] = ["*"]
        self.load_persisted_settings()

    def load_persisted_settings(self):
        """Loads user-configured settings saved from the UI if present."""
        if SETTINGS_FILE.exists():
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("gemini_api_key"):
                        self.gemini_api_key = data["gemini_api_key"].strip()
                    if data.get("assistant_name"):
                        self.assistant_name = data["assistant_name"].strip()
                    if data.get("gemini_model"):
                        self.gemini_model = data["gemini_model"].strip()
            except Exception as e:
                print(f"[Config] Error loading settings.json: {e}")

    def save_persisted_settings(self):
        """Saves current dynamic settings to settings.json."""
        try:
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "gemini_api_key": self.gemini_api_key,
                    "assistant_name": self.assistant_name,
                    "gemini_model": self.gemini_model,
                }, f, indent=2)
        except Exception as e:
            print(f"[Config] Error saving settings.json: {e}")

    def set_api_key(self, key: str) -> None:
        self.gemini_api_key = key.strip()
        self.save_persisted_settings()

    def set_assistant_name(self, name: str) -> None:
        self.assistant_name = name.strip() or "SecureVision AI"
        self.save_persisted_settings()

    def get_masked_key(self) -> str:
        if not self.gemini_api_key:
            return ""
        if len(self.gemini_api_key) <= 8:
            return "••••••••"
        return f"{self.gemini_api_key[:4]}...{self.gemini_api_key[-4:]}"

    def is_key_configured(self) -> bool:
        return bool(self.gemini_api_key)

config = AppConfig()
