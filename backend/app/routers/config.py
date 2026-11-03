"""
Configuration & Settings Endpoints
Allows dynamic API Key input, key validation, and Assistant Name updates from the Extension UI.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.config import config
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api", tags=["Configuration"])

class ApiKeyPayload(BaseModel):
    api_key: str
    validate_immediately: Optional[bool] = True

class AssistantNamePayload(BaseModel):
    assistant_name: str

@router.get("/config")
@router.get("/jarvis/config")
async def get_config():
    """Retrieve current backend configuration and assistant status."""
    return {
        "status": "ok",
        "assistant_name": config.assistant_name,
        "has_api_key": config.is_key_configured(),
        "api_key_masked": config.get_masked_key(),
        "gemini_model": config.gemini_model
    }

@router.post("/config/key")
@router.post("/jarvis/config/key")
async def set_api_key(payload: ApiKeyPayload):
    """
    Sets or updates the Google Gemini API Key.
    Validates with Google API if validate_immediately is True.
    """
    key = payload.api_key.strip()
    if not key:
        return {"success": False, "error": "API Key cannot be empty."}

    if payload.validate_immediately:
        val_res = await gemini_service.validate_api_key(key)
        if not val_res.get("valid"):
            return {
                "success": False,
                "error": val_res.get("reason", "API Key is invalid or expired."),
                "is_expired": True
            }

    config.set_api_key(key)
    return {
        "success": True,
        "message": "Gemini API Key validated and saved successfully.",
        "api_key_masked": config.get_masked_key(),
        "assistant_name": config.assistant_name
    }

@router.post("/config/name")
async def set_assistant_name(payload: AssistantNamePayload):
    """Updates the custom assistant name (e.g. 'JARVIS', 'SecureVision AI', etc.)."""
    name = payload.assistant_name.strip()
    if not name:
        return {"success": False, "error": "Assistant name cannot be empty."}

    config.set_assistant_name(name)
    return {
        "success": True,
        "message": f"Assistant name updated to '{config.assistant_name}'.",
        "assistant_name": config.assistant_name
    }

@router.post("/config/validate")
async def validate_key_only(payload: ApiKeyPayload):
    """Tests if an API key is active without updating saved config."""
    return await gemini_service.validate_api_key(payload.api_key)
