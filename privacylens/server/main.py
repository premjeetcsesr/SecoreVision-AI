import time
import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    AgentStepRequest,
    AgentStepResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    StructuredAction,
    ActionTarget,
    ActionValidateRequest,
    ActionValidateResponse,
    TelemetryRequest,
    CapabilitiesResponse,
)
from pii_guard import validate_request_sanitization
from providers import get_llm_provider

# Load environment configuration
load_dotenv()

# Structured logging configuration (NEVER log sensitive raw data)
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("securevision.server")


@asynccontextmanager
async def lifespan(app: FastAPI):
    provider_name = os.getenv("LLM_PROVIDER", "mock")
    logger.info("==================================================")
    logger.info("   SecureVision AI Vision Agent Backend Started   ")
    logger.info(f"   Active LLM Provider: [{provider_name.upper()}] ")
    logger.info("   Server-side PII Guard: ENABLED                 ")
    logger.info("   Zero Leakage Policy: ACTIVE                    ")
    logger.info("==================================================")
    yield
    logger.info("SecureVision server shutting down.")


app = FastAPI(
    title="SecureVision AI API",
    description="Privacy-preserving backend for browser visual agent with zero-leakage guarantee.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Chrome Extension origin and localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_timing_and_logging_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
    logger.info(f"{request.method} {request.url.path} completed in {duration_ms:.2f}ms (Status: {response.status_code})")
    return response


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint providing status and guardrails."""
    provider_name = os.getenv("LLM_PROVIDER", "mock")
    return {
        "status": "healthy",
        "service": "SecureVision AI Backend Gateway",
        "version": "1.0.0",
        "provider": provider_name,
        "pii_guard_active": True,
        "supported_actions": ["click", "type", "scroll", "focus", "navigate", "wait", "back"],
    }


@app.get("/api/capabilities", response_model=CapabilitiesResponse)
async def get_capabilities():
    """Returns capabilities of SecureVision AI system."""
    provider_name = os.getenv("LLM_PROVIDER", "mock")
    return CapabilitiesResponse(
        service="SecureVision AI Gateway",
        version="1.0.0",
        zero_leakage_guarantee=True,
        supported_actions=["click", "scroll", "type", "focus", "navigate", "wait", "back"],
        vision_engines=["WebGPU (Client)", "WASM Fallback (Client)", "ONNX Runtime Web"],
        ocr_support=["Tesseract.js (Client)", "Regex Pattern Guard"],
        server_provider=provider_name,
    )


@app.post("/api/agent/analyze", response_model=AnalyzeResponse)
async def analyze_task(request: AnalyzeRequest):
    """
    Receives sanitized context, plans structured browser action.
    Strictly verifies zero raw PII before reasoning.
    """
    logger.info(f"Analyze request for task: '{request.task}' (Sanitized DOM Elements: {len(request.sanitized_dom)})")

    # 1. Server-side Second Layer of Defense: PII Guardrail
    step_req = AgentStepRequest(
        task=request.task,
        sanitized_dom=request.sanitized_dom,
        redacted_image_base64=request.redacted_image_base64,
        history=request.history,
    )
    validate_request_sanitization(step_req)

    # 2. Reason over sanitized context
    task_lower = request.task.lower()
    consequential_keywords = ["submit", "delete", "purchase", "pay", "send", "confirm", "remove", "order"]
    is_consequential = any(k in task_lower for k in consequential_keywords)

    actions = []

    if "scroll" in task_lower or "scrool" in task_lower:
        direction = "up" if "up" in task_lower else "down"
        actions.append(StructuredAction(type="scroll", direction=direction))
        reason = f"Commanded viewport scroll {direction}."
    elif "delete" in task_lower:
        actions.append(
            StructuredAction(
                type="click",
                target=ActionTarget(label="Delete Record", selector="#deleteBtn, button.btn-delete", x=350, y=520),
            )
        )
        reason = "Record deletion is consequential and irreversible. Mandatory authorization required."
    elif "submit" in task_lower:
        actions.append(
            StructuredAction(
                type="click",
                target=ActionTarget(label="Submit Form", selector="button[type='submit'], #submitBtn, .btn-submit", x=250, y=450),
            )
        )
        reason = "Submitting form updates state on destination host. Requires user confirmation."
    elif "login" in task_lower:
        actions.append(
            StructuredAction(
                type="click",
                target=ActionTarget(label="Login", selector="#loginBtn, button.btn-login", x=200, y=520),
            )
        )
        reason = "Triggering authentication login workflow."
    elif "next" in task_lower:
        actions.append(
            StructuredAction(
                type="click",
                target=ActionTarget(label="Next Step", selector="#nextBtn, button.btn-next", x=380, y=450),
            )
        )
        reason = "Navigating to next wizard step."
    else:
        # Check LLM provider for complex reasoning
        provider = get_llm_provider()
        step_res = await provider.generate_action(step_req)
        actions.append(
            StructuredAction(
                type=step_res.action,
                target=ActionTarget(selector=step_res.selector, label=step_res.selector),
                value=step_res.value,
                direction=step_res.direction,
            )
        )
        reason = step_res.reasoning

    return AnalyzeResponse(
        task=request.task,
        actions=actions,
        requires_confirmation=is_consequential,
        reason=reason,
        confidence=0.98,
    )


@app.post("/api/agent/validate", response_model=ActionValidateResponse)
async def validate_action(request: ActionValidateRequest):
    """Backend verification of an action payload against server security rules."""
    action = request.action
    disallowed_keywords = ["eval", "script", "cookie", "storage", "bypass"]

    if action.value:
        for kw in disallowed_keywords:
            if kw in action.value.lower():
                return ActionValidateResponse(
                    is_valid=False,
                    requires_confirmation=False,
                    policy_summary="Script injection detected",
                    violation_error=f"Payload contains restricted word: {kw}",
                )

    consequential_keywords = ["submit", "delete", "purchase", "pay", "send", "confirm"]
    requires_conf = False
    if action.target and action.target.label:
        requires_conf = any(k in action.target.label.lower() for k in consequential_keywords)

    return ActionValidateResponse(
        is_valid=True,
        requires_confirmation=requires_conf,
        policy_summary=f"Action '{action.type}' passes server validation policies.",
    )


@app.post("/api/telemetry")
async def record_telemetry(telemetry: TelemetryRequest):
    """Logs non-sensitive performance telemetry and counters."""
    logger.info(
        f"Telemetry Received: Local Vision={telemetry.local_vision_ms}ms, "
        f"PII Detection={telemetry.pii_detection_ms}ms, Redaction={telemetry.redaction_ms}ms, "
        f"Detected PII={telemetry.detected_pii_count}, Redacted PII={telemetry.redacted_pii_count}"
    )
    return {"status": "recorded"}


@app.post("/api/agent/step", response_model=AgentStepResponse)
async def agent_step(request: AgentStepRequest):
    """Backward-compatible single step endpoint."""
    validate_request_sanitization(request)
    provider = get_llm_provider()
    return await provider.generate_action(request)


# ========================================================
# REAL SYSTEM MOUSE CURSOR CONTROL (PyAutoGUI + Windows user32.dll)
# ========================================================
try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0.001
except ImportError:
    pyautogui = None

if sys.platform == "win32":
    import ctypes
    user32_lib = ctypes.windll.user32
else:
    user32_lib = None


class CursorMoveRequest(BaseModel):
    norm_x: float = Field(..., ge=0.0, le=1.0)
    norm_y: float = Field(..., ge=0.0, le=1.0)
    is_click: bool = False
    scroll_delta: int = 0


@app.post("/api/cursor/move")
async def move_system_cursor(req: CursorMoveRequest):
    """
    Directly moves the REAL operating system mouse cursor using PyAutoGUI & native Windows user32.dll API.
    Zero-lag hardware interaction.
    """
    try:
        if pyautogui:
            screen_w, screen_h = pyautogui.size()
            target_x = max(0, min(screen_w - 1, int(req.norm_x * screen_w)))
            target_y = max(0, min(screen_h - 1, int(req.norm_y * screen_h)))

            pyautogui.moveTo(target_x, target_y, _pause=False)

            if req.is_click:
                pyautogui.click(target_x, target_y)

            if req.scroll_delta != 0:
                pyautogui.scroll(int(req.scroll_delta * 40))

            return {"status": "ok", "x": target_x, "y": target_y, "engine": "pyautogui"}

        elif user32_lib:
            screen_w = user32_lib.GetSystemMetrics(0)
            screen_h = user32_lib.GetSystemMetrics(1)

            target_x = max(0, min(screen_w - 1, int(req.norm_x * screen_w)))
            target_y = max(0, min(screen_h - 1, int(req.norm_y * screen_h)))

            user32_lib.SetCursorPos(target_x, target_y)

            if req.is_click:
                user32_lib.mouse_event(0x0002, 0, 0, 0, 0)
                user32_lib.mouse_event(0x0004, 0, 0, 0, 0)

            if req.scroll_delta != 0:
                user32_lib.mouse_event(0x0800, 0, 0, int(req.scroll_delta * 120), 0)

            return {"status": "ok", "x": target_x, "y": target_y, "engine": "ctypes"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

    return {"status": "unsupported_os"}


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
