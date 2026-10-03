from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class SanitizedDOMElement(BaseModel):
    tag: str
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    label: Optional[str] = None
    placeholder: Optional[str] = None
    visible_text: Optional[str] = None
    selector: str
    bounding_box: Optional[BoundingBox] = None
    is_interactive: bool = True
    redacted_placeholder: Optional[str] = None
    current_value: Optional[str] = None


class HistoryItem(BaseModel):
    step: int
    action: str
    selector: Optional[str] = None
    value: Optional[str] = None
    reasoning: Optional[str] = None


class AgentStepRequest(BaseModel):
    task: str = Field(..., description="User's high-level goal in natural language")
    redaction_scheme_version: str = Field("1.0", description="Version of the client-side typed placeholder scheme")
    sanitized_dom: List[SanitizedDOMElement] = Field(default_factory=list, description="Sanitized interactive elements with typed placeholders")
    redacted_image_base64: Optional[str] = Field(None, description="Base64 JPEG/PNG of the page with visual blackouts applied")
    history: List[HistoryItem] = Field(default_factory=list, description="Actions executed so far in the multi-step session")


ActionType = Literal["click", "type", "scroll", "select", "wait", "done", "focus", "navigate", "back"]


class AgentStepResponse(BaseModel):
    action: ActionType = Field(..., description="Action to perform on the webpage")
    selector: Optional[str] = Field(None, description="Stable CSS selector of the target element")
    value: Optional[str] = Field(None, description="Value to type or select. Must use typed placeholders like [EMAIL_1] if referring to sensitive fields.")
    direction: Optional[Literal["up", "down"]] = Field(None, description="Scroll direction if action is 'scroll'")
    reasoning: str = Field(..., description="Explanation of why this action was selected based on the sanitized context")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    step_number: int = Field(default=1, description="Sequential step index")


# ========================================================
# SECUREVISION AI - Strict Structured AI Schema
# ========================================================

class ActionTarget(BaseModel):
    label: Optional[str] = None
    selector: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class StructuredAction(BaseModel):
    type: ActionType
    target: Optional[ActionTarget] = None
    value: Optional[str] = None
    direction: Optional[Literal["up", "down"]] = None


class AnalyzeRequest(BaseModel):
    task: str = Field(..., description="User's intent / command")
    sanitized_dom: List[SanitizedDOMElement] = Field(default_factory=list)
    redacted_image_base64: Optional[str] = Field(None, description="Sanitized image with opaque blackout rectangles")
    url: Optional[str] = None
    history: List[HistoryItem] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    task: str
    actions: List[StructuredAction]
    requires_confirmation: bool = False
    reason: str
    confidence: float = 1.0


class ActionValidateRequest(BaseModel):
    action: StructuredAction
    viewport: Optional[Dict[str, float]] = None


class ActionValidateResponse(BaseModel):
    is_valid: bool
    requires_confirmation: bool
    policy_summary: str
    violation_error: Optional[str] = None


class TelemetryRequest(BaseModel):
    local_vision_ms: Optional[float] = None
    ocr_ms: Optional[float] = None
    pii_detection_ms: Optional[float] = None
    redaction_ms: Optional[float] = None
    backend_latency_ms: Optional[float] = None
    detected_pii_count: Optional[int] = 0
    redacted_pii_count: Optional[int] = 0
    device_mode: Optional[str] = "webgpu"


class CapabilitiesResponse(BaseModel):
    service: str = "SecureVision AI Gateway"
    version: str = "1.0.0"
    zero_leakage_guarantee: bool = True
    supported_actions: List[str] = ["click", "scroll", "type", "focus", "navigate", "wait", "back"]
    vision_engines: List[str] = ["WebGPU (Client)", "WASM Fallback (Client)", "ONNX Runtime Web"]
    ocr_support: List[str] = ["Tesseract.js (Client)", "Regex Pattern Guard"]
    server_provider: str
