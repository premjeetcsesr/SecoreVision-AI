"""
Audio endpoints for Speech-To-Text (STT) and Text-To-Speech (TTS).
Ported from Jarvis audio streaming pipeline with fallback local support.
"""

import io
import logging
from typing import Optional
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel
import httpx
from backend.config import config

logger = logging.getLogger("audio_api")
router = APIRouter()

class TTSInput(BaseModel):
    text: str
    voice: Optional[str] = None
    speed: Optional[float] = 1.0

@router.post("/transcribe")
async def transcribe_audio(request: Request):
    """
    STT endpoint: Transcribes uploaded audio recording (WAV/WebM) to text.
    Proxies to configured STT service (e.g. Whisper / MLX) or provides local fallback.
    """
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Audio body is required")

    # If STT_URL is configured and not pointing to self
    if config.STT_URL and "127.0.0.1:8000" not in config.STT_URL:
        try:
            files = {"file": ("recording.wav", body, request.headers.get("content-type", "audio/wav"))}
            data = {"model": config.STT_MODEL, "response_format": "json"}
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(config.STT_URL, files=files, data=data)
                if res.status_code == 200:
                    json_data = res.json()
                    return {"text": json_data.get("text", "").strip()}
        except Exception as e:
            logger.warning(f"Upstream STT failed: {e}")

    # Fallback response indicating audio was received
    return {
        "text": "",
        "note": "STT audio processed. Web Speech API client-side transcription active.",
        "status": "ready"
    }

@router.post("/tts")
async def text_to_speech(payload: TTSInput):
    """
    TTS endpoint: Converts text into spoken audio stream.
    Proxies to configured TTS service (Qwen3-TTS / Kokoro) or indicates browser synthesis.
    """
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty")

    if config.TTS_URL and "127.0.0.1:8000" not in config.TTS_URL:
        try:
            req_body = {
                "model": config.TTS_MODEL,
                "input": text,
                "voice": payload.voice or config.TTS_VOICE,
                "instruct": config.TTS_INSTRUCT,
                "lang_code": config.TTS_LANG_CODE,
                "temperature": config.TTS_TEMPERATURE,
                "speed": payload.speed or config.TTS_SPEED,
                "response_format": "wav"
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(config.TTS_URL, json=req_body)
                if res.status_code == 200:
                    return Response(
                        content=res.content,
                        media_type="audio/wav",
                        headers={"Cache-Control": "no-store"}
                    )
        except Exception as e:
            logger.warning(f"Upstream TTS failed: {e}")

    # Return instruction for client-side Web Speech Synthesis
    return {
        "status": "ready",
        "text": text,
        "voice": payload.voice or config.TTS_VOICE,
        "speed": payload.speed or config.TTS_SPEED,
        "client_instruction": "USE_BROWSER_SYNTHESIS"
    }
