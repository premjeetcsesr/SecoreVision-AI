"""
Backward compatibility bridge for agent_server.py
Directs execution to app.main:app
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
_DIR = Path(__file__).resolve().parent
if str(_DIR) not in sys.path:
    sys.path.insert(0, str(_DIR))

from app.main import app
from app.config import config

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print("=" * 65)
    print(f"  SecureVision AI Agent Server")
    print(f"  Host: http://{host}:{port}")
    print(f"  Assistant: {config.assistant_name}")
    print("=" * 65)
    uvicorn.run(app, host=host, port=port, reload=False)
