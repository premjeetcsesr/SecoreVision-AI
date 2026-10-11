"""
Chitty Assistant API Endpoints
Handles voice & text command interpretation, safety permission confirmations,
speech-to-text / text-to-speech proxies, and assistant status telemetry.
"""

import os
import time
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from backend.ai.chitty_interpreter import ChittyCommandInterpreter, ChittyAction
from backend.api.analyze import audit_zero_leakage, SanitizedRequest

logger = logging.getLogger("chitty_api")
router = APIRouter()
interpreter = ChittyCommandInterpreter()

class ChittyCommandRequest(BaseModel):
    command: str = Field(..., description="Spoken or typed natural language command")
    language: Optional[str] = Field("en-US", description="Language code: en-US, hi-IN, etc.")
    page_context: Optional[Dict[str, Any]] = None
    sanitized_dom: List[Dict[str, Any]] = Field(default_factory=list)
    sanitized_image: Optional[str] = None
    redaction_telemetry: Optional[Dict[str, Any]] = None

class ChittyCommandResponse(BaseModel):
    success: bool = True
    action: ChittyAction
    privacy_audit: Dict[str, Any]
    latency_ms: int
    assistant_name: str = "Chitty"
    is_local_decision: bool = True

class ConfirmationRequest(BaseModel):
    action: str
    target: Optional[str] = None
    target_selector: Optional[str] = None
    target_id: Optional[str] = None
    value: Optional[Any] = None
    confirmed: bool = True

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-Standard"
    speed: Optional[float] = 1.0

@router.get("/config")
async def get_chitty_config():
    """Returns Chitty assistant configuration, models, allowlists, and capabilities."""
    allowlist = os.getenv("BROWSER_ALLOWLIST", "*").split(",")
    return {
        "assistant_name": "Chitty",
        "version": "2.0.0",
        "voice_enabled": True,
        "languages_supported": ["en-US", "en-IN", "hi-IN"],
        "stt_engine": os.getenv("STT_ENGINE", "web-speech-api-with-backend-stt"),
        "tts_engine": os.getenv("TTS_ENGINE", "web-speech-synthesis-with-backend-tts"),
        "barge_in_supported": True,
        "privacy_preservation": "Client-Side Zero-Leakage Active",
        "domain_allowlist": [d.strip() for d in allowlist if d.strip()],
        "status": "online"
    }

@router.post("/command", response_model=ChittyCommandResponse)
async def process_chitty_command(payload: ChittyCommandRequest):
    """
    Main Chitty assistant interaction endpoint:
    Processes natural language commands (English & Hindi) against sanitized screen DOM.
    """
    start_t = time.time()
    cmd = payload.command.strip()
    if not cmd:
        raise HTTPException(status_code=400, detail="Command cannot be empty")

    # 1. Zero-Leakage Audit on incoming payload
    audit_req = SanitizedRequest(
        task=cmd,
        sanitized_image=payload.sanitized_image,
        sanitized_dom=payload.sanitized_dom,
        url=payload.page_context.get("url") if payload.page_context else None,
        title=payload.page_context.get("title") if payload.page_context else None,
        redaction_telemetry=payload.redaction_telemetry
    )
    audit_report = audit_zero_leakage(audit_req)

    # 2. Interpret Command into structured, validated action
    action = interpreter.interpret(
        command_text=cmd,
        page_context=payload.page_context,
        sanitized_dom=payload.sanitized_dom
    )

    elapsed_ms = int((time.time() - start_t) * 1000)

    return ChittyCommandResponse(
        success=True,
        action=action,
        privacy_audit=audit_report,
        latency_ms=elapsed_ms,
        assistant_name="Chitty",
        is_local_decision=True
    )

@router.post("/confirm-action")
async def confirm_sensitive_action(payload: ConfirmationRequest):
    """
    Validates user confirmation for high-risk or sensitive browser actions.
    """
    if not payload.confirmed:
        return {
            "status": "cancelled",
            "message": "Sensitive action cancelled by user.",
            "speech_response": "Action cancelled."
        }

    return {
        "status": "approved",
        "message": f"Action {payload.action} confirmed and authorized.",
        "speech_response": f"Proceeding with {payload.action}.",
        "action": payload.dict()
    }

@router.post("/tts")
async def text_to_speech(payload: TTSRequest):
    """
    Text-to-speech fallback endpoint.
    Notifies client of speech parameters or delegates to configured TTS audio provider.
    """
    return {
        "status": "ready",
        "text": payload.text,
        "voice": payload.voice,
        "speed": payload.speed,
        "client_instruction": "USE_BROWSER_SYNTHESIS_OR_FALLBACK"
    }
