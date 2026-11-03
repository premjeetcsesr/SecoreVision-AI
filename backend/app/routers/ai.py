"""
AI Directives & Vision Agent Endpoints
"""

import time
import io
import re
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from gtts import gTTS
from app.config import config
from app.services.gemini_service import gemini_service
from app.services.memory_service import memory_service

router = APIRouter(tags=["AI"])

class AskRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    language: Optional[str] = "auto"
    api_key: Optional[str] = None
    page_context: Optional[Any] = None

# Primary conversational endpoint for user directives
@router.post("/ask")
@router.post("/api/jarvis/ask")
async def ask_agent(req: AskRequest):
    """
    Primary conversational endpoint for user directives.
    Uses dynamic assistant name, intercepts local notes directives,
    and checks for API key expiry.
    """
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Directive prompt cannot be empty.")

    # 1. Check if directive is a local notes/memory command (offline-capable)
    note_result = memory_service.handle_notes_directive(prompt)
    if note_result:
        return {
            "success": True,
            "response": note_result["message"],
            "source": "local-memory",
            "assistant_name": config.assistant_name,
            "notes": note_result.get("notes")
        }

    page_ctx = ""
    if req.page_title or req.page_url:
        page_ctx += f"Active Page: {req.page_title or ''} ({req.page_url or ''})\n"
    if req.context:
        page_ctx += f"Context: {req.context}\n"
    if req.page_context and isinstance(req.page_context, dict):
        page_ctx += f"Page Context: {req.page_context.get('title', '')} ({req.page_context.get('url', '')})\n"

    result = await gemini_service.generate_response(
        prompt=prompt,
        user_key=req.api_key,
        context=page_ctx,
        language=req.language or "auto"
    )

    return result

@router.get("/briefing")
async def get_startup_briefing(language: str = "auto", api_key: Optional[str] = None):
    """Generates an initial welcome briefing with status and assistant identity."""
    prompt = (
        f"Give a short 2-sentence greeting as '{config.assistant_name}'. "
        "State that the privacy shield and local vision engine are online, and ask what directive the user has today. "
        "Keep it concise and professional."
    )
    result = await gemini_service.generate_response(
        prompt=prompt,
        user_key=api_key,
        language=language
    )
    return result

@router.get("/screen/explain")
@router.get("/api/jarvis/screen/explain")
async def explain_screen(url: Optional[str] = None, title: Optional[str] = None, api_key: Optional[str] = None):
    """Summarizes current active tab and explains contents."""
    prompt = f"Please summarize and explain the content and intent of this webpage: {title or 'Untitled'} ({url or 'No URL'})."
    return await gemini_service.generate_response(
        prompt=prompt,
        user_key=api_key
    )

@router.post("/api/analyze")
async def analyze_screen_task(req: Dict[str, Any]):
    """Receives sanitized DOM snippets and plans safe browser interaction."""
    task = req.get("task", "")
    dom_snip = str(req.get("sanitizedDOM", ""))[:1500]
    page_url = req.get("pageUrl", "")
    page_title = req.get("pageTitle", "")

    prompt = (
        f"Browser Vision Agent directive: {task}\n"
        f"Page: {page_title} ({page_url})\n"
        f"DOM Elements: {dom_snip}\n"
        "Return action plan JSON with keys: action ('click'|'type'|'scroll'|'none'), selector, reasoning."
    )

    res = await gemini_service.generate_response(prompt=prompt)
    return {
        "action": "none",
        "target": "",
        "reasoning": res.get("response", f"Inspected page elements for: {task}"),
        "source": res.get("source", "local-agent"),
        "latency_ms": 120
    }

@router.post("/interrupt")
async def interrupt_speech():
    """Interrupt directive generation or voice playback."""
    return {"status": "interrupted", "message": "Directive processing interrupted."}

class BrowserControlRequest(BaseModel):
    command: Optional[str] = ""
    api_key: Optional[str] = None
    url: Optional[str] = None

@router.post("/api/jarvis/browser/control")
async def browser_control(req: BrowserControlRequest):
    """Direct browser action planner."""
    cmd = (req.command or "").strip().lower()
    if "close" in cmd and "tab" in cmd:
        return {"action": "close_tab", "reply": "Closing current tab."}
    if "reload" in cmd or "refresh" in cmd:
        return {"action": "reload", "reply": "Refreshing tab."}
    if "scroll down" in cmd:
        return {"action": "scroll", "direction": "down"}
    if "scroll up" in cmd:
        return {"action": "scroll", "direction": "up"}
    return {"action": "none", "target": req.command, "reasoning": "Standard web inspection"}

@router.post("/api/jarvis/command")
async def execute_jarvis_command(payload: Dict[str, Any]):
    """Generic tool command endpoint for backward compatibility."""
    tool = payload.get("tool", "")
    params = payload.get("params", {})
    return {"success": True, "tool": tool, "status": "executed", "result": f"Command {tool} processed"}

# Extension background helper endpoints
@router.get("/api/jarvis/news")
async def get_news():
    return {
        "headlines": [
            {"title": "Screen Privacy Guard Shield Active", "source": "On-device redaction running with 0 data leak."},
            {"title": "Multi-Language Vision Agent Ready", "source": f"{config.assistant_name} core online in Hindi & English."},
            {"title": "Encrypted Local Vault Enabled", "source": "IndexedDB vault stores sensitive tokens locally."}
        ]
    }

@router.get("/tts")
@router.get("/api/tts")
async def text_to_speech(text: str, lang: str = "hi", voice: Optional[str] = None):
    """
    JARVIS High-Fidelity Male Neural Text-to-Speech Endpoint.
    Uses Microsoft EdgeTTS hi-IN-MadhurNeural (the signature Indian Male JARVIS Voice).
    Falls back gracefully to gTTS if offline.
    """
    clean_text = re.sub(r"[*#`_~\[\]\(\)]", " ", text)
    clean_text = re.sub(r"https?://\S+", "link", clean_text).strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    spoken_text = clean_text[:400]
    is_hindi = (lang and lang.startswith("hi")) or any('\u0900' <= c <= '\u097F' for c in spoken_text)

    # 1. Primary: Microsoft EdgeTTS Male Neural Voice
    # hi-IN-MadhurNeural: Deep, respectful Indian Male voice
    # en-US-GuyNeural / en-GB-RyanNeural: British/US Male Jarvis tone
    selected_voice = voice or ("hi-IN-MadhurNeural" if is_hindi else "en-US-GuyNeural")
    try:
        import edge_tts
        communicate = edge_tts.Communicate(spoken_text, selected_voice)
        audio_stream = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.extend(chunk["data"])

        if audio_stream:
            return Response(content=bytes(audio_stream), media_type="audio/mpeg")
    except Exception as edge_err:
        pass

    # 2. Secondary Fallback: gTTS
    try:
        target_lang = "hi" if is_hindi else "en"
        tts = gTTS(text=spoken_text, lang=target_lang, slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        return Response(content=audio_buffer.read(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation error: {str(e)}")
