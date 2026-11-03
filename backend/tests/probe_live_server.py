"""
Live TCP/HTTP probe of SecxureVision AI server
"""
import sys
import time
import threading
import httpx
import uvicorn
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

def main():
    def run_srv():
        uvicorn.run(app, host="127.0.0.1", port=8889, log_level="warning")

    t = threading.Thread(target=run_srv, daemon=True)
    t.start()
    time.sleep(2.0)

    client = httpx.Client(base_url="http://127.0.0.1:8889", timeout=5.0)

    # 1. Health
    h = client.get("/health").json()
    print("Health probe:", h["status"])
    assert h["status"] == "ok"

    # 2. Add note
    n1 = client.post("/api/jarvis/notes", json={"note": "Live TCP probe note"}).json()
    print("Note created:", n1["note"]["text"], "ID:", n1["note"]["id"])
    assert n1["note"]["text"] == "Live TCP probe note"

    # 3. Ask directive for notes
    a = client.post("/ask", json={"prompt": "Show my notes"}).json()
    print("Ask response source:", a["source"])
    print("Ask response text:", a["response"].replace("\n", " "))
    assert a["source"] == "local-memory"
    assert "Live TCP probe note" in a["response"]

    # 4. Search note
    s = client.get("/api/jarvis/notes?q=Live").json()
    print("Search count:", s["count"])
    assert s["count"] >= 1

    # 5. Delete note
    note_id = n1["note"]["id"]
    d = client.delete(f"/api/jarvis/notes/{note_id}").json()
    print("Delete result:", d["message"])
    assert f"Note #{note_id} deleted" in d["message"]

    # 6. Memory set and get
    m_set = client.post("/api/jarvis/memory", json={"category": "preferences", "key": "lang", "value": "Hindi"}).json()
    print("Memory set:", m_set["message"])
    assert "preferences.lang" in m_set["message"]

    m_get = client.get("/api/jarvis/memory?category=preferences").json()
    print("Memory get value:", m_get["memory"]["preferences"]["lang"]["value"])
    assert m_get["memory"]["preferences"]["lang"]["value"] == "Hindi"

    # Clean up memory
    client.delete("/api/jarvis/memory/preferences/lang")

    print("\n[OK] ALL LIVE SERVER PROBES PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
