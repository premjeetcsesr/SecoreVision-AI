"""
Privacy-Preserving Vision Agent - Production Server Launcher
Starts the FastAPI backend server with SQLite WAL database, Zero-Leakage audit engine,
and privacy enforcement APIs.
"""

import sys
import uvicorn
from backend.db.database import init_db

if __name__ == "__main__":
    init_db()
    print("=" * 70)
    print("  PRIVACY-PRESERVING VISION AGENT - PRODUCTION SERVER")
    print("=" * 70)
    print("  * Database             : SQLite WAL (data/privacy_vault.db)")
    print("  * Zero-Leakage Audit   : Active & Enforced")
    print("  * Backend API          : http://127.0.0.1:8000")
    print("  * Interactive API Docs : http://127.0.0.1:8000/docs")
    print("  * Health & Audit Status: http://127.0.0.1:8000/api/health")
    print("  * Extension Directory  : ./extension (Load Unpacked in Chrome)")
    print("=" * 70)

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True, log_level="info")
