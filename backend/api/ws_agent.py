"""
WebSocket endpoint for real-time streaming Agent sessions.
Matches Jarvis client protocol with tool execution events, barge-in, and status cues.
"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.ai.agent_session import AgentSession

logger = logging.getLogger("ws_agent")
router = APIRouter()

@router.websocket("/ws")
@router.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    await websocket.accept()

    async def send_event(event: dict):
        try:
            await websocket.send_text(json.dumps(event))
        except Exception as e:
            logger.debug(f"Error sending ws event: {e}")

    session = AgentSession(send_event=lambda ev: websocket.app.state.loop.create_task(send_event(ev)) if hasattr(websocket.app.state, 'loop') else None)
    # Define direct sender
    session.send_event = lambda ev: session._emit_direct(websocket, ev)

    async def emit_direct(ws: WebSocket, ev: dict):
        try:
            await ws.send_text(json.dumps(ev))
        except Exception:
            pass

    session._emit_direct = lambda ws, ev: None  # initialized below

    # Custom sender to handle async ws send
    def direct_send(event: dict):
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(websocket.send_text(json.dumps(event)))
        except Exception as e:
            logger.debug(f"Failed direct ws send: {e}")

    session.send_event = direct_send
    direct_send({"type": "ready", "assistant": "Chitty"})
    direct_send({"type": "status", "value": "ready"})

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                msg = json.loads(raw_text)
                msg_type = msg.get("type")
                if msg_type == "prompt":
                    text = msg.get("text", "").strip()
                    if text:
                        import asyncio
                        asyncio.create_task(session.prompt(text))
                elif msg_type == "cancel":
                    session.cancel()
                elif msg_type == "reset":
                    session.reset()
            except json.JSONDecodeError:
                direct_send({"type": "error", "message": "Invalid JSON format"})
    except WebSocketDisconnect:
        session.cancel()
        logger.info("WebSocket agent client disconnected.")
    except Exception as e:
        logger.warning(f"WebSocket session error: {e}")
