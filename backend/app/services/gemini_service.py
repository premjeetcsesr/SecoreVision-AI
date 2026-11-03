"""
Gemini AI Service
Direct REST integration with Google Generative AI API.
Provides robust key-expiry detection, validation, and multi-language responses.
"""

import httpx
import logging
from typing import Dict, Any, Optional
from app.config import config

logger = logging.getLogger("securevision-ai")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

class GeminiService:
    def __init__(self):
        self.timeout = 30.0

    async def validate_api_key(self, api_key: str) -> Dict[str, Any]:
        """
        Validates an API key by making a lightweight request to Google Gemini API.
        Supports both traditional 'AIzaSy...' keys and modern 'AQ.Ab...' authorization keys.
        Returns {'valid': True} or {'valid': False, 'reason': ...}
        """
        key = (api_key or "").strip()
        if not key:
            return {"valid": False, "reason": "API key cannot be empty"}

        if not (key.startswith("AIza") or key.startswith("AQ.") or len(key) >= 25):
            return {
                "valid": False,
                "reason": f"Format galat hai: Google Gemini API key 'AIzaSy...' ya 'AQ.Ab...' se shuru hoti hai. Aapne '{key[:5]}...' enter ki hai. Kripya Google AI Studio (aistudio.google.com/app/apikey) se sahi Gemini API key copy karein."
            }

        # Authoritative, model-independent validation endpoint from Google
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return {"valid": True, "message": "API key is valid and active."}
                
                # Analyze failure
                err_body = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_body.get("error", {}).get("message", res.text)
                status = err_body.get("error", {}).get("status", "")

                if "API_KEY_INVALID" in err_msg or status == "INVALID_ARGUMENT" or res.status_code == 400:
                    return {
                        "valid": False,
                        "reason": f"Google ne API Key reject kar di (Invalid Key): {err_msg[:90]}. Kripya check karein ki key aistudio.google.com se sahi copy hui hai."
                    }
                elif res.status_code == 403 or "PERMISSION_DENIED" in err_msg:
                    return {
                        "valid": False,
                        "reason": "Yeh API Key expire ho chuki hai ya permissions blocked hain. Kripya nayi key banayein."
                    }
                elif res.status_code == 429:
                    return {
                        "valid": False,
                        "reason": "Gemini API ka free quota limit exceed ho gaya hai. Thodi der baad try karein ya nayi key banayein."
                    }
                else:
                    return {
                        "valid": False,
                        "reason": f"Google API error ({res.status_code}): {err_msg[:120]}"
                    }

        except httpx.RequestError as e:
            return {"valid": False, "reason": f"Network error connecting to Google: {str(e)}"}
        except Exception as e:
            return {"valid": False, "reason": f"Unexpected error validating key: {str(e)}"}

    async def generate_response(
        self,
        prompt: str,
        user_key: Optional[str] = None,
        context: Optional[str] = None,
        system_instruction: Optional[str] = None,
        language: str = "auto"
    ) -> Dict[str, Any]:
        """
        Generates AI response using Google Gemini API.
        Gracefully handles expired/missing keys with clean user feedback.
        """
        active_key = (user_key or config.gemini_api_key or "").strip()

        if not active_key:
            return {
                "success": False,
                "error_type": "MISSING_KEY",
                "response": f"Namaste! {config.assistant_name} online hai, lekin Gemini API Key set nahi hai.\n\nPlease Settings tab me jaakar apni Google Gemini API Key enter karein.",
                "assistant_name": config.assistant_name
            }

        # Build prompt with JARVIS Cognitive Brain Protocol
        sys_prompt = system_instruction or (
            f"You are J.A.R.V.I.S. (Mark LIV Cognitive Protocol, assistant name '{config.assistant_name}'). "
            "You are Tony Stark's ultra-intelligent, witty, and loyal personal AI assistant and screen companion for Boss. "
            "Before answering, THINK analytically like JARVIS about Boss's directive, intent, and screen context. "
            "Always reply in natural, respectful, and fluent Indian Hindi / Hinglish. "
            "Always address the user as 'Boss' or 'Ji Boss' (e.g. 'Ji Boss, main dekh raha hoon', 'Haan Boss, computer bilkul safe hai'). Never address the user as 'Sir'. "
            "CRITICAL FORMAT RULES: You MUST structure your output in two sections:\n"
            "[THINKING]: One brief analytical thought about what Boss requested, security state, and the best action.\n"
            "[REPLY]: 1 to 2 punchy, natural Hindi sentences addressed to Boss. Never use asterisks (*), markdown formatting, hashtags, or emojis in [REPLY] because it is read aloud via male voice text-to-speech."
        )

        full_prompt = ""
        if context:
            full_prompt += f"[Current Screen/Page Context]:\n{context}\n\n"
        full_prompt += f"[User Directive]:\n{prompt}"

        # Build model candidate list with fallback order (using modern active Gemini models)
        candidates_models = [
            config.gemini_model,
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.8-flash",
            "gemini-flash-lite-latest",
        ]
        seen_models = set()
        model_queue = [m for m in candidates_models if m and not (m in seen_models or seen_models.add(m))]

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": full_prompt}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": sys_prompt}]
            },
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1024
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                last_res = None
                last_network_error = None

                for current_model in model_queue:
                    url = f"{GEMINI_BASE_URL}/{current_model}:generateContent?key={active_key}"
                    try:
                        res = await client.post(url, json=payload)
                    except httpx.RequestError as net_err:
                        last_network_error = net_err
                        logger.warning(f"Network error trying model {current_model}: {net_err}. Trying fallback...")
                        continue

                    last_res = res

                    if res.status_code == 200:
                        if current_model != config.gemini_model:
                            config.gemini_model = current_model
                            config.save_persisted_settings()

                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            text_parts = [p.get("text", "") for p in parts if "text" in p]
                            raw_reply = "".join(text_parts).strip()

                            thought_text = ""
                            spoken_reply = raw_reply

                            # Extract JARVIS Cognitive Thought vs Spoken Response
                            if "[REPLY]:" in raw_reply:
                                split_parts = raw_reply.split("[REPLY]:", 1)
                                thought_text = split_parts[0].replace("[THINKING]:", "").strip()
                                spoken_reply = split_parts[1].strip()
                            elif "[THINKING]:" in raw_reply:
                                split_parts = raw_reply.split("[THINKING]:", 1)
                                thought_text = split_parts[1].strip()

                            # Clean any leftover symbols for natural audio speech
                            clean_spoken = spoken_reply.replace("*", "").replace("#", "").replace("`", "").strip()

                            return {
                                "success": True,
                                "thought": thought_text,
                                "response": clean_spoken or "Directive processed successfully.",
                                "source": "gemini",
                                "assistant_name": config.assistant_name,
                                "model": current_model,
                                "voice_gender": "male"
                            }
                        return {
                            "success": True,
                            "response": "No content generated.",
                            "source": "gemini",
                            "assistant_name": config.assistant_name,
                            "model": current_model
                        }

                    # If 404 (model deprecated / not found / not allowed), continue loop to next model
                    if res.status_code == 404:
                        continue

                    # If not 404 (e.g. 400, 401, 403, 429), break and report actual error
                    break

                res = last_res
                if res is None and last_network_error:
                    return {
                        "success": False,
                        "error_type": "NETWORK_ERROR",
                        "response": f"Network error connecting to Gemini API: {str(last_network_error)}",
                        "assistant_name": config.assistant_name
                    }

                # Error handling for expired/invalid key
                err_data = res.json() if res and res.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_data.get("error", {}).get("message", res.text if res else "Unknown error")
                
                if res and (res.status_code in (400, 401, 403) or "API_KEY" in err_msg or "INVALID" in err_msg or "PERMISSION_DENIED" in err_msg):
                    return {
                        "success": False,
                        "error_type": "API_KEY_EXPIRED",
                        "response": f"⚠️ Gemini API Key invalid ya expire ho gayi hai!\n\nPlease Extension ke Settings me jakar nayi Google Gemini API key enter karein.",
                        "details": err_msg,
                        "assistant_name": config.assistant_name
                    }
                elif res and res.status_code == 429:
                    return {
                        "success": False,
                        "error_type": "RATE_LIMIT",
                        "response": "⚠️ Gemini API rate limit ya quota exceed ho gaya hai. Thodi der baad dubara try karein.",
                        "assistant_name": config.assistant_name
                    }
                else:
                    status_code = res.status_code if res else "Unknown"
                    return {
                        "success": False,
                        "error_type": "API_ERROR",
                        "response": f"Gemini API returned error ({status_code}): {err_msg[:150]}",
                        "assistant_name": config.assistant_name
                    }

        except httpx.RequestError as e:
            return {
                "success": False,
                "error_type": "NETWORK_ERROR",
                "response": f"Network error connecting to AI backend / Gemini API: {str(e)}",
                "assistant_name": config.assistant_name
            }
        except Exception as e:
            return {
                "success": False,
                "error_type": "INTERNAL_ERROR",
                "response": f"Internal error generating response: {str(e)}",
                "assistant_name": config.assistant_name
            }

gemini_service = GeminiService()
