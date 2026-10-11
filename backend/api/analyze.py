"""
Privacy-Preserving Vision Agent - Analyze API Endpoint
Processes sanitized requests, executes server-side reasoning, and conducts privacy zero-leakage audits.
"""

import re
import time
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Request
from backend.ai.vision_agent import VisionAgent
from backend.db.database import (
    record_audit,
    record_incident,
    get_recent_audits,
    get_audit_summary,
    sync_tokens
)

logger = logging.getLogger("analyze_api")
router = APIRouter()
vision_agent = VisionAgent()

# Strict Regexes for Server-Side Security Leakage Auditing
RAW_EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b')
RAW_PHONE_REGEX = re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
RAW_SSN_REGEX = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
RAW_CC_REGEX = re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b')

class SanitizedRequest(BaseModel):
    task: str = Field(..., description="User instruction for the agent")
    sanitized_image: Optional[str] = Field(None, description="Base64 encoded JPEG/PNG with local redaction applied")
    sanitized_dom: List[Dict[str, Any]] = Field(default_factory=list, description="Structured DOM elements with sanitized text")
    url: Optional[str] = None
    title: Optional[str] = None
    viewport: Optional[Dict[str, Any]] = None
    redaction_telemetry: Optional[Dict[str, Any]] = None

class ActionResponse(BaseModel):
    action: str = Field(..., description="Action type: click | type | select | scroll | submit | navigate")
    target_id: Optional[str] = None
    target_selector: Optional[str] = None
    target_text: Optional[str] = None
    coordinates: Optional[Dict[str, int]] = None
    value: Optional[Any] = None
    reasoning: str
    confidence: float
    privacy_audit: Dict[str, Any]
    latency_ms: int

def audit_zero_leakage(request_payload: SanitizedRequest) -> Dict[str, Any]:
    """
    Independent server audit: verify that incoming sanitized DOM nodes and text contains NO raw PII.
    """
    dom_text_blob = " ".join([
        f"{n.get('text', '')} {n.get('placeholder', '')}" for n in request_payload.sanitized_dom
    ])

    raw_emails = RAW_EMAIL_REGEX.findall(dom_text_blob)
    raw_ssns = RAW_SSN_REGEX.findall(dom_text_blob)
    raw_ccs = [c for c in RAW_CC_REGEX.findall(dom_text_blob) if len(c.replace('-', '').replace(' ', '')) >= 15]

    # Check for recognized sanitized tokens
    sanitized_tokens = re.findall(r'\[(?:EMAIL|PHONE|CARD|SSN|PERSON|NAME|FACE|PWD|PASSWORD|API_KEY|KEY|TOKEN|SECRET|ADDRESS|AADHAAR|PAN|REDACTED|PROTECTED)[^\]]*\]', dom_text_blob)

    leak_detected = bool(raw_emails or raw_ssns or raw_ccs)

    telemetry = request_payload.redaction_telemetry or {}
    counts = {}
    for cat in telemetry.get("entity_categories", []):
        counts[cat] = counts.get(cat, 0) + 1

    return {
        "raw_pii_detected_on_server": leak_detected,
        "zero_leakage_verified": not leak_detected,
        "sanitized_tokens_found_count": len(sanitized_tokens),
        "entities_redacted_at_client": telemetry.get("entities_redacted", len(sanitized_tokens)),
        "redaction_style": telemetry.get("redaction_style", "semantic"),
        "counts": counts,
        "audit_timestamp": time.time()
    }

@router.post("/analyze", response_model=ActionResponse)
async def analyze_sanitized_screen(payload: SanitizedRequest):
    """
    Primary agent inference endpoint:
    Receives only sanitized screenshots + sanitized DOM.
    Returns targeted browser action.
    """
    if not payload.task:
        raise HTTPException(status_code=400, detail="Task cannot be empty")

    start_t = time.time()

    # 1. Zero-Leakage Security Audit
    audit_report = audit_zero_leakage(payload)
    client_ip = "127.0.0.1"

    if audit_report["raw_pii_detected_on_server"]:
        logger.warning("[SECURITY AUDIT ALERT] Raw PII pattern detected in incoming payload! Client redaction may have failed.")
        record_incident({
            "incident_type": "RAW_PII_LEAK_DETECTED",
            "domain": payload.url or "",
            "details": f"Raw PII found in incoming task payload: {payload.task}",
            "severity": "critical",
            "client_ip": client_ip
        })

    # 2. Server-Side AI Reasoning
    decision = vision_agent.reason(
        task=payload.task,
        sanitized_dom=payload.sanitized_dom,
        sanitized_image_b64=payload.sanitized_image,
        viewport=payload.viewport,
        metadata={"url": payload.url, "title": payload.title}
    )

    total_latency = int((time.time() - start_t) * 1000)

    # 3. Persistent Database Logging
    record_audit({
        "timestamp": audit_report["audit_timestamp"],
        "domain": payload.url or "unknown",
        "url": payload.url or "",
        "task": payload.task,
        "total_entities_redacted": audit_report.get("entities_redacted_at_client", 0),
        "tokens_found_count": audit_report.get("sanitized_tokens_found_count", 0),
        "raw_pii_detected": audit_report.get("raw_pii_detected_on_server", False),
        "zero_leakage_verified": audit_report.get("zero_leakage_verified", True),
        "categories": audit_report.get("counts", {}),
        "latency_ms": total_latency,
        "client_ip": client_ip
    })

    return ActionResponse(
        action=decision.get("action", "click"),
        target_id=decision.get("target_id"),
        target_selector=decision.get("target_selector"),
        target_text=decision.get("target_text"),
        coordinates=decision.get("coordinates", {"x": 640, "y": 400}),
        value=decision.get("value"),
        reasoning=decision.get("reasoning", "Action computed from sanitized layout context."),
        confidence=decision.get("confidence", 0.95),
        privacy_audit=audit_report,
        latency_ms=total_latency
    )


@router.get("/audit/logs")
async def get_audit_logs_endpoint(limit: int = Query(50, ge=1, le=200), domain: Optional[str] = None):
    """Retrieves persistent audit log history from SQLite database."""
    logs = get_recent_audits(limit=limit, domain=domain)
    return {"status": "success", "count": len(logs), "logs": logs}


@router.get("/audit/summary")
async def get_audit_summary_endpoint():
    """Retrieves aggregated zero-leakage statistics from SQLite database."""
    summary = get_audit_summary()
    return {"status": "success", "summary": summary}


class SyncVaultPayload(BaseModel):
    records: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/vault/sync")
async def sync_vault_endpoint(payload: SyncVaultPayload):
    """Syncs or backs up masked token records from extension to persistent database."""
    count = sync_tokens(payload.records)
    return {"status": "success", "synced_records_count": count}

