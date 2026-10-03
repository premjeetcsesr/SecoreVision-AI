from providers.base import BaseLLMProvider
from schemas import AgentStepRequest, AgentStepResponse


class MockProvider(BaseLLMProvider):
    """
    Deterministic rule-based agent provider for PrivacyLens.
    Ensures demos, hackathon evaluation, and offline unit testing never fail.
    Operates strictly on sanitized DOM elements and typed placeholders.
    """

    async def generate_action(self, request: AgentStepRequest) -> AgentStepResponse:
        history_steps = len(request.history)
        step_number = history_steps + 1

        task_lower = (request.task or "").lower()

        # 1. Handle scroll intent
        if any(w in task_lower for w in ["scroll", "scrool", "niche", "upar", "down", "up"]):
            direction = "up" if any(w in task_lower for w in ["up", "upar", "top"]) else "down"
            return AgentStepResponse(
                action="scroll",
                selector="window",
                value=direction,
                reasoning=f"Scrolling the webpage {direction} as instructed by operator.",
                confidence=0.99,
                step_number=step_number,
            )

        # 2. Handle screenshot intent
        if any(w in task_lower for w in ["screenshot", "capture", "photo", "screen shot", "snap"]):
            return AgentStepResponse(
                action="screenshot",
                selector="viewport",
                value=None,
                reasoning="Capturing visible tab viewport on-device with zero-leakage masking.",
                confidence=0.99,
                step_number=step_number,
            )

        # 3. Handle click intent
        if any(w in task_lower for w in ["click", "open", "press", "select", "daba"]):
            target_kw = task_lower.replace("click", "").replace("open", "").replace("press", "").strip()
            matching_btn = None
            if target_kw:
                matching_btn = next((
                    e for e in request.sanitized_dom
                    if target_kw in (e.visible_text or e.name or e.id or e.selector or "").lower()
                ), None)
            if not matching_btn:
                matching_btn = next((
                    e for e in request.sanitized_dom
                    if e.tag in ["button", "a"] or "button" in (e.selector or "")
                ), None)

            if matching_btn:
                return AgentStepResponse(
                    action="click",
                    selector=matching_btn.selector,
                    reasoning=f"Clicking '{matching_btn.visible_text or matching_btn.selector}' on webpage.",
                    confidence=0.96,
                    step_number=step_number,
                )

        # 4. Fill candidate inputs that need filling
        if input_elements:
            next_elem = input_elements[0]
            desc = (
                f"{next_elem.name or ''} {next_elem.id or ''} "
                f"{next_elem.label or ''} {next_elem.placeholder or ''}"
            ).lower()

            placeholder_value = "[TEXT_INPUT]"
            field_name = "form input"

            if any(k in desc for k in ["name", "full_name", "first_name"]):
                placeholder_value = "[NAME_1]"
                field_name = "full name field"
            elif any(k in desc for k in ["email", "e-mail"]):
                placeholder_value = "[EMAIL_1]"
                field_name = "email address field"
            elif any(k in desc for k in ["phone", "mobile", "tel"]):
                placeholder_value = "[PHONE_1]"
                field_name = "mobile number field"
            elif any(k in desc for k in ["aadhaar", "uidai"]):
                placeholder_value = "[AADHAAR_1]"
                field_name = "Aadhaar number field"
            elif any(k in desc for k in ["pan", "tax_id"]):
                placeholder_value = "[PAN_1]"
                field_name = "PAN card field"
            elif any(k in desc for k in ["pass", "pwd", "secret"]):
                placeholder_value = "[PASSWORD_1]"
                field_name = "secure password field"
            elif any(k in desc for k in ["card", "cc", "debit"]):
                placeholder_value = "[CARD_NUMBER_1]"
                field_name = "payment card number field"
            elif any(k in desc for k in ["cvv", "cvc"]):
                placeholder_value = "[CVV_1]"
                field_name = "card CVV field"
            elif any(k in desc for k in ["address", "city", "location"]):
                placeholder_value = "[ADDRESS_1]"
                field_name = "residential address field"

            return AgentStepResponse(
                action="type",
                selector=next_elem.selector,
                value=placeholder_value,
                reasoning=(
                    f"Identified unfilled {field_name} at selector '{next_elem.selector}'. "
                    f"Instructing extension to substitute with client-side value for {placeholder_value}."
                ),
                confidence=0.98,
                step_number=step_number,
            )

        # 2. If all inputs are filled, click submit button
        if submit_buttons and submit_buttons[0].selector not in interacted_selectors:
            sub_btn = submit_buttons[0]
            return AgentStepResponse(
                action="click",
                selector=sub_btn.selector,
                reasoning=(
                    f"All input fields have been filled. Clicking submission element "
                    f"'{sub_btn.visible_text or sub_btn.id or sub_btn.selector}' to advance task."
                ),
                confidence=0.96,
                step_number=step_number,
            )

        # 3. If everything is filled and submitted, or no actions left
        return AgentStepResponse(
            action="done",
            reasoning=(
                f"Task '{request.task}' completed successfully. "
                "All matching interactive elements have been inspected and processed."
            ),
            confidence=1.0,
            step_number=step_number,
        )
