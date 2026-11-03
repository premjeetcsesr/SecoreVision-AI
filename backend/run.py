"""
Run script for SecureVision AI Backend
Starts Uvicorn server respecting PORT and HOST environment variables.
"""

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path regardless of execution directory
sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from app.config import config

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print("=" * 65)
    print(f"  SecureVision AI — Deployable Backend Server")
    print(f"  Host: http://{host}:{port}")
    print(f"  Assistant: {config.assistant_name}")
    print(f"  Gemini Key: {'Set' if config.is_key_configured() else 'Not configured (enter in UI)'}")
    print("=" * 65)
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
