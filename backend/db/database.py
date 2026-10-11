"""
Privacy-Preserving Vision Agent - Database Storage Engine
Provides persistent SQLite storage for privacy audit logs, security incidents,
anonymized token registry, and system telemetry with WAL mode enabled.
"""

import os
import json
import time
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger("backend_db")

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "privacy_vault.db"


def get_db_connection() -> sqlite3.Connection:
    """Creates a configured connection to the SQLite database."""
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db():
    """Initializes tables and indexes if they do not exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Audit Logs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                audit_id TEXT UNIQUE NOT NULL,
                timestamp REAL NOT NULL,
                domain TEXT,
                url TEXT,
                task TEXT,
                total_entities_redacted INTEGER DEFAULT 0,
                tokens_found_count INTEGER DEFAULT 0,
                raw_pii_detected INTEGER DEFAULT 0,
                zero_leakage_verified INTEGER DEFAULT 1,
                categories_json TEXT,
                latency_ms INTEGER DEFAULT 0,
                client_ip TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_domain ON audit_logs(domain);")

        # 2. Security Incidents Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id TEXT UNIQUE NOT NULL,
                timestamp REAL NOT NULL,
                incident_type TEXT NOT NULL,
                domain TEXT,
                details TEXT,
                severity TEXT DEFAULT 'warning',
                client_ip TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_incident_time ON security_incidents(timestamp);")

        # 3. Token Vault Registry
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS token_vault (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_id TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                masked_value TEXT,
                domain TEXT,
                url TEXT,
                created_at REAL NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_id ON token_vault(token_id);")

        # 4. Shield Events Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shield_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                domain TEXT,
                action TEXT NOT NULL,
                items_shielded INTEGER DEFAULT 0,
                details TEXT
            );
        """)
        conn.commit()
        logger.info(f"Database initialized at {DB_PATH} with WAL mode.")


def record_audit(audit_data: Dict[str, Any]) -> str:
    """Inserts a new zero-leakage audit record."""
    audit_id = audit_data.get("audit_id") or f"audit_{int(time.time()*1000)}_{os.urandom(3).hex()}"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO audit_logs (
                audit_id, timestamp, domain, url, task,
                total_entities_redacted, tokens_found_count,
                raw_pii_detected, zero_leakage_verified,
                categories_json, latency_ms, client_ip
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_id,
            audit_data.get("timestamp", time.time()),
            audit_data.get("domain", ""),
            audit_data.get("url", ""),
            audit_data.get("task", ""),
            audit_data.get("total_entities_redacted", 0),
            audit_data.get("tokens_found_count", 0),
            1 if audit_data.get("raw_pii_detected") else 0,
            1 if audit_data.get("zero_leakage_verified", True) else 0,
            json.dumps(audit_data.get("categories", {})),
            audit_data.get("latency_ms", 0),
            audit_data.get("client_ip", "127.0.0.1")
        ))
        conn.commit()
    return audit_id


def record_incident(incident_data: Dict[str, Any]) -> str:
    """Logs a security leak alert or policy violation."""
    incident_id = f"inc_{int(time.time()*1000)}_{os.urandom(3).hex()}"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO security_incidents (
                incident_id, timestamp, incident_type, domain, details, severity, client_ip
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            incident_id,
            incident_data.get("timestamp", time.time()),
            incident_data.get("incident_type", "PII_LEAK_ATTEMPT"),
            incident_data.get("domain", ""),
            incident_data.get("details", ""),
            incident_data.get("severity", "critical"),
            incident_data.get("client_ip", "127.0.0.1")
        ))
        conn.commit()
    return incident_id


def get_recent_audits(limit: int = 50, domain: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves recent audit log records."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if domain:
            cursor.execute(
                "SELECT * FROM audit_logs WHERE domain = ? ORDER BY timestamp DESC LIMIT ?",
                (domain, limit)
            )
        else:
            cursor.execute(
                "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "audit_id": r["audit_id"],
                "timestamp": r["timestamp"],
                "domain": r["domain"],
                "url": r["url"],
                "task": r["task"],
                "total_entities_redacted": r["total_entities_redacted"],
                "tokens_found_count": r["tokens_found_count"],
                "raw_pii_detected": bool(r["raw_pii_detected"]),
                "zero_leakage_verified": bool(r["zero_leakage_verified"]),
                "categories": json.loads(r["categories_json"] or "{}"),
                "latency_ms": r["latency_ms"]
            })
        return result


def get_audit_summary() -> Dict[str, Any]:
    """Calculates global privacy statistics directly from database records."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total, SUM(zero_leakage_verified) as passed, SUM(tokens_found_count) as tokens, SUM(raw_pii_detected) as leaks FROM audit_logs")
        row = cursor.fetchone()
        total = row["total"] or 0
        passed = row["passed"] or 0
        tokens = row["tokens"] or 0
        leaks = row["leaks"] or 0

        cursor.execute("SELECT COUNT(*) as inc_total FROM security_incidents")
        inc_row = cursor.fetchone()
        inc_count = inc_row["inc_total"] or 0

        leak_free_rate = 100.0 if total == 0 else round((passed / total) * 100, 2)

        return {
            "total_audits_performed": total,
            "zero_leakage_compliant_count": passed,
            "raw_leaks_prevented_count": leaks,
            "total_tokens_processed": tokens,
            "security_incidents_recorded": inc_count,
            "compliance_rate_percent": leak_free_rate
        }


def sync_tokens(tokens: List[Dict[str, Any]]) -> int:
    """Syncs or backs up masked token records into the database."""
    if not tokens:
        return 0
    count = 0
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for t in tokens:
            token_id = t.get("id") or t.get("token") or f"tok_{os.urandom(4).hex()}"
            cursor.execute("""
                INSERT OR REPLACE INTO token_vault (
                    token_id, category, masked_value, domain, url, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                token_id,
                t.get("category", "other"),
                t.get("masked", "••••••••"),
                t.get("domain", ""),
                t.get("url", ""),
                time.time()
            ))
            count += 1
        conn.commit()
    return count


# Auto-initialize DB on import
try:
    init_db()
except Exception as e:
    logger.warning(f"DB auto-init notice: {e}")
