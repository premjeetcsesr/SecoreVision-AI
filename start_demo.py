"""
Privacy-Preserving Vision Agent Server Launcher (Compatibility entrypoint)
"""
from start_server import main if "main" in dir() else None
import uvicorn
from backend.db.database import init_db

if __name__ == "__main__":
    init_db()
    print("=" * 70)
    print("  PRIVACY-PRESERVING VISION AGENT - PRODUCTION SERVER")
    print("=" * 70)
    print("  * Database             : SQLite WAL (data/privacy_vault.db)")
    print("  * Backend API          : http://127.0.0.1:8000")
    print("  * Health & Audit Status: http://127.0.0.1:8000/api/health")
    print("=" * 70)
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True, log_level="info")
