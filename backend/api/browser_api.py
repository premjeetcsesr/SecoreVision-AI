"""
Browser automation REST API endpoints for Chitty & Jarvis.
Provides status, live screenshots, mouse/keyboard input, and tab controls.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Response, HTTPException, status
from pydantic import BaseModel
from backend.browser.agent_browser import agent_browser

router = APIRouter()

class BrowserInputRequest(BaseModel):
    action: str  # click | wheel | key
    x: Optional[float] = None
    y: Optional[float] = None
    deltaX: Optional[float] = None
    deltaY: Optional[float] = None
    key: Optional[str] = None

class NewTabRequest(BaseModel):
    url: Optional[str] = "about:blank"

@router.get("/status")
async def get_browser_status():
    """Returns current browser automation status, open tabs, and active URL."""
    return agent_browser.status()

@router.get("/screenshot")
async def get_browser_screenshot():
    """Returns JPEG screenshot of current browser page."""
    try:
        image_bytes = await agent_browser.screenshot()
        return Response(
            content=image_bytes,
            media_type="image/jpeg",
            headers={"Cache-Control": "no-store"}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Screenshot error: {e}")

@router.post("/input")
async def post_browser_input(payload: BrowserInputRequest):
    """Sends mouse click, wheel scroll, or keyboard press to active page."""
    try:
        snapshot = await agent_browser.input(payload.action, payload.model_dump())
        return {"success": True, "snapshot": snapshot}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tabs/new")
async def post_new_tab(payload: NewTabRequest):
    """Creates a new browser tab navigating to the given URL (allowlist enforced)."""
    try:
        snapshot = await agent_browser.new_tab(payload.url or "about:blank")
        return {"success": True, "snapshot": snapshot}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tabs/close")
async def post_close_tab():
    """Closes the current active browser tab."""
    try:
        snapshot = await agent_browser.close_tab()
        return {"success": True, "snapshot": snapshot}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
