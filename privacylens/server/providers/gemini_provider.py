import os
import json
import logging
import httpx
from providers.base import BaseLLMProvider
from schemas import AgentStepRequest, AgentStepResponse

logger = logging.getLogger("privacylens.gemini")

SYSTEM_PROMPT = """You are PrivacyLens Agent, an autonomous browser vision assistant.
CRITICAL PRIVACY DIRECTIVE:
The webpage context you receive has been strictly REDACTED on-device by the client extension before transmission.
All personally identifiable information (PII), credentials, and financial tokens have been replaced with typed placeholders:
Examples: [NAME_1], [EMAIL_1], [PHONE_1], [AADHAAR_1], [PAN_1], [PASSWORD_1], [CARD_NUMBER_1], [CVV_1].
Images have been blacked out or blurred at sensitive regions.

RULES:
1. NEVER attempt to guess, reconstruct, or hallucinate real private data.
2. In your output action, when typing into a field that requires personal data, reference the placeholder AS-IS (e.g. value="[NAME_1]"). The client extension will substitute the true value locally from its encrypted memory.
3. Choose the single most effective next action to achieve the user's task.
4. Output must be strictly valid JSON adhering to the schema:
{
  "action": "click" | "type" | "scroll" | "select" | "wait" | "done",
  "selector": "<CSS selector of target element, or null>",
  "value": "<text to type, or null>",
  "direction": "up" | "down" | null,
  "reasoning": "<brief justification>",
  "confidence": <float between 0.0 and 1.0>
}
"""


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    async def generate_action(self, request: AgentStepRequest) -> AgentStepResponse:
        if not self.api_key:
            logger.warning("No GEMINI_API_KEY set. Falling back to MockProvider.")
            from providers.mock_provider import MockProvider
            return await MockProvider().generate_action(request)

        # Prepare formatted context
        dom_summary = []
        for elem in request.sanitized_dom:
            desc = f"Tag: <{elem.tag}> | Selector: '{elem.selector}'"
            if elem.name:
                desc += f" | name: '{elem.name}'"
            if elem.id:
                desc += f" | id: '{elem.id}'"
            if elem.placeholder:
                desc += f" | placeholder: '{elem.placeholder}'"
            if elem.label:
                desc += f" | label: '{elem.label}'"
            if elem.visible_text:
                desc += f" | text: '{elem.visible_text[:60]}'"
            if elem.redacted_placeholder:
                desc += f" | REDACTED: {elem.redacted_placeholder}"
            dom_summary.append(desc)

        dom_text = "\n".join(dom_summary[:80])  # limit to top 80 elements

        history_text = "\n".join([
            f"Step {h.step}: {h.action} on '{h.selector}' -> {h.reasoning}"
            for h in request.history
        ]) or "No prior steps."

        user_content = (
            f"USER TASK: {request.task}\n\n"
            f"EXECUTION HISTORY:\n{history_text}\n\n"
            f"SANITIZED INTERACTIVE DOM ELEMENTS:\n{dom_text}\n\n"
            f"Respond with the next JSON action."
        )

        parts = [{"text": user_content}]

        # Include base64 redacted image if present
        if request.redacted_image_base64:
            clean_b64 = request.redacted_image_base64.split(",")[-1]
            parts.insert(0, {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": clean_b64
                }
            })

        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": parts
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()
                text_out = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_out)

                return AgentStepResponse(
                    action=parsed.get("action", "done"),
                    selector=parsed.get("selector"),
                    value=parsed.get("value"),
                    direction=parsed.get("direction"),
                    reasoning=parsed.get("reasoning", "Action derived from multimodal visual reasoning."),
                    confidence=float(parsed.get("confidence", 0.9)),
                    step_number=len(request.history) + 1,
                )
            except Exception as e:
                logger.error(f"Gemini API error: {e}. Falling back to rule-based MockProvider.")
                from providers.mock_provider import MockProvider
                return await MockProvider().generate_action(request)
