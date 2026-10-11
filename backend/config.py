"""
Configuration module for Privacy-Preserving Vision Agent & Chitty Voice Assistant.
Unifies all settings from Jarvis backend and the Vision Agent.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT_DIR / ".env")

def _get_bool(key: str, default: bool = False) -> bool:
    val = os.getenv(key)
    if val is None:
        return default
    return val.strip().lower() in ("true", "1", "yes", "on")

def _get_int(key: str, default: int) -> int:
    val = os.getenv(key)
    if val is None:
        return default
    try:
        return int(val.strip())
    except ValueError:
        return default

def _get_float(key: str, default: float) -> float:
    val = os.getenv(key)
    if val is None:
        return default
    try:
        return float(val.strip())
    except ValueError:
        return default

class Config:
    # Server
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = _get_int("PORT", 8000)
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    # LLM & AI Engine (Jarvis + Vision Agent)
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "http://127.0.0.1:8080/v1").rstrip("/")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "local-no-key")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "qwen-local")
    LLM_CONTEXT_SIZE: int = _get_int("LLM_CONTEXT_SIZE", 65536)
    MODEL_PROFILE: str = os.getenv("MODEL_PROFILE", "auto")

    # Cloud VLM Keys (optional)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "").strip()

    # STT Settings (Speech-To-Text)
    STT_URL: str = os.getenv("STT_URL", "http://127.0.0.1:8000/v1/audio/transcriptions")
    STT_MODEL: str = os.getenv("STT_MODEL", "mlx-community/whisper-small-mlx-q4")
    STT_ENGINE: str = os.getenv("STT_ENGINE", "web-speech-api-with-backend-stt")

    # TTS Settings (Text-To-Speech)
    TTS_URL: str = os.getenv("TTS_URL", "http://127.0.0.1:8000/v1/audio/speech")
    TTS_PROVIDER: str = os.getenv("TTS_PROVIDER", "qwen3-tts")
    TTS_MODEL: str = os.getenv("TTS_MODEL", "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-6bit")
    TTS_VOICE: str = os.getenv("TTS_VOICE", "Ryan")
    TTS_LANG_CODE: str = os.getenv("TTS_LANG_CODE", "English")
    TTS_TEMPERATURE: float = _get_float("TTS_TEMPERATURE", 0.35)
    TTS_TOP_P: float = _get_float("TTS_TOP_P", 0.9)
    TTS_TOP_K: int = _get_int("TTS_TOP_K", 20)
    TTS_REPETITION_PENALTY: float = _get_float("TTS_REPETITION_PENALTY", 1.10)
    TTS_SPEED: float = _get_float("TTS_SPEED", 1.0)
    TTS_STREAMING_INTERVAL: float = _get_float("TTS_STREAMING_INTERVAL", 0.32)
    TTS_INSTRUCT: str = os.getenv("TTS_INSTRUCT", "Neutral, clear speech, steady pacing.")
    TTS_ENGINE: str = os.getenv("TTS_ENGINE", "web-speech-synthesis-with-backend-tts")

    # Workspace & Browser Sandboxing (Jarvis)
    AGENT_WORKSPACE: Path = Path(os.getenv("AGENT_WORKSPACE", str(ROOT_DIR / "workspace"))).resolve()
    BROWSER_PROFILE: Path = Path(os.getenv("BROWSER_PROFILE", str(ROOT_DIR / "data" / "browser-profile"))).resolve()
    BROWSER_HEADLESS: bool = _get_bool("BROWSER_HEADLESS", True)
    BROWSER_USER: str = os.getenv("BROWSER_USER", "agent")
    BROWSER_PASSWORD: str = os.getenv("BROWSER_PASSWORD", "change-me")
    BROWSER_CDP_URL: str = os.getenv("BROWSER_CDP_URL", "http://127.0.0.1:9223")
    BROWSER_ALLOWLIST_RAW: str = os.getenv(
        "BROWSER_ALLOWLIST",
        "*"
    )

    @classmethod
    def get_browser_allowlist(cls) -> list[str]:
        items = [item.strip().lower() for item in cls.BROWSER_ALLOWLIST_RAW.split(",") if item.strip()]
        return items if items else ["*"]

    # Privacy & Safety
    ENFORCE_ZERO_LEAKAGE_AUDIT: bool = _get_bool("ENFORCE_ZERO_LEAKAGE_AUDIT", True)

config = Config()
