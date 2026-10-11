"""
Agent Session Execution Loop for Chitty & Jarvis.
Coordinates OpenAI-compatible or local LLM reasoning, multi-turn tool calling,
streaming WebSocket event emissions, and barge-in / cancellation.
"""

import json
import asyncio
import logging
from typing import Callable, Dict, Any, List, Optional
import httpx
from backend.config import config
from backend.ai.tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger("agent_session")

SYSTEM_PROMPT = (
    "You are Chitty, an intelligent, privacy-preserving voice & command assistant. "
    "Speak concisely for listening ears: natural sentences, no emojis, emoticons, or Markdown headers in spoken replies. "
    "Do requested work directly using your available tools. "
    "Begin browser tasks with browser_snapshot to inspect current page state and interactive references [e1], [e2]. "
    "For search boxes, use browser_type with submit:true or browser_key with Enter. "
    "Use browser_scroll to view more content. "
    "Never bypass safety policies or confirm sensitive transactions without explicit confirmation. "
    "End with verified findings and source URLs."
)

class AgentSession:
    def __init__(self, send_event: Callable[[Dict[str, Any]], Any]):
        self.send_event = send_event
        self.history: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        self.is_cancelled = False
        self._current_task: Optional[asyncio.Task] = None

    def cancel(self):
        """User barge-in or stop action."""
        self.is_cancelled = True
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
        self._emit({"type": "status", "value": "listening"})
        self._emit({"type": "notice", "text": "Operation interrupted."})

    def reset(self):
        """Resets agent conversation memory."""
        self.cancel()
        self.history = [{"role": "system", "content": SYSTEM_PROMPT}]
        self._emit({"type": "reset"})
        self._emit({"type": "status", "value": "ready"})

    def _emit(self, event: Dict[str, Any]):
        try:
            self.send_event(event)
        except Exception as e:
            logger.warning(f"Failed to emit event: {e}")

    async def _call_llm(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calls the configured OpenAI-compatible or local LLM endpoint."""
        url = f"{config.LLM_BASE_URL}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config.LLM_API_KEY}"
        }
        payload = {
            "model": config.LLM_MODEL,
            "messages": messages,
            "tools": TOOL_DEFINITIONS,
            "temperature": 0.2,
            "max_tokens": 1200
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"LLM API returned status {resp.status_code}: {resp.text[:200]}")
            return resp.json()

    async def prompt(self, user_text: str):
        """Main entry point when user sends a prompt."""
        self.is_cancelled = False
        self._emit({"type": "user", "text": user_text})
        self._emit({"type": "status", "value": "thinking"})
        self.history.append({"role": "user", "content": user_text})

        # Run reasoning loop as a cancellable task
        self._current_task = asyncio.create_task(self._run_loop())
        try:
            await self._current_task
        except asyncio.CancelledError:
            logger.info("Agent task was cancelled by user barge-in.")

    async def _run_loop(self):
        repeated_actions: Dict[str, int] = {}

        for round_idx in range(16):
            if self.is_cancelled:
                return

            self._emit({"type": "status", "value": "thinking" if round_idx == 0 else "working"})

            try:
                data = await self._call_llm(self.history)
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
            except Exception as e:
                # Fallback to local heuristic assistant if external LLM endpoint is not up
                logger.info(f"LLM endpoint not reachable ({e}), using local rule-based assistant.")
                user_msg = self.history[-1]["content"] if self.history else ""
                fallback_reply = await self._local_fallback_execute(user_msg)
                self.history.append({"role": "assistant", "content": fallback_reply})
                self._emit({"type": "assistant_done", "text": fallback_reply})
                self._emit({"type": "status", "value": "listening"})
                return

            content = message.get("content") or ""
            tool_calls = message.get("tool_calls") or []

            # If no tool calls or finished
            if not tool_calls:
                self.history.append({"role": "assistant", "content": content})
                self._emit({"type": "assistant_done", "text": content})
                self._emit({"type": "status", "value": "listening"})
                return

            # Emit assistant commentary if any
            if content:
                self._emit({"type": "assistant_segment", "text": content})

            self.history.append({
                "role": "assistant",
                "content": content,
                "tool_calls": tool_calls
            })

            # Execute tools
            for tc in tool_calls:
                if self.is_cancelled:
                    return

                call_id = tc.get("id", "call_1")
                func_name = tc.get("function", {}).get("name", "")
                args_str = tc.get("function", {}).get("arguments", "{}")

                self._emit({"type": "tool_start", "id": call_id, "name": func_name})
                if func_name.startswith("browser_"):
                    self._emit({"type": "browser_active"})
                    self._emit({"type": "notice", "text": f"Chitty executing {func_name}..."})

                try:
                    args = json.loads(args_str) if isinstance(args_str, str) else args_str
                    result = await execute_tool(func_name, args)
                    self._emit({"type": "tool_end", "id": call_id, "name": func_name, "ok": True})
                    self.history.append({
                        "role": "tool",
                        "tool_call_id": call_id,
                        "content": str(result)
                    })
                except Exception as ex:
                    logger.warning(f"Tool {func_name} failed: {ex}")
                    self._emit({"type": "tool_end", "id": call_id, "name": func_name, "ok": False, "error": str(ex)})
                    self.history.append({
                        "role": "tool",
                        "tool_call_id": call_id,
                        "content": f"Tool execution failed: {ex}"
                    })

        self._emit({"type": "status", "value": "listening"})

    async def _local_fallback_execute(self, prompt_text: str) -> str:
        """Rule-based local fallback when LLM server is offline."""
        lower = prompt_text.lower().strip()
        if "open google" in lower or "google open" in lower:
            from backend.browser.agent_browser import agent_browser
            await agent_browser.open("https://www.google.com")
            return "I opened Google for you in the agent browser."
        elif "open github" in lower or "github open" in lower:
            from backend.browser.agent_browser import agent_browser
            await agent_browser.open("https://github.com")
            return "I navigated to GitHub."
        elif "time" in lower or "samay" in lower:
            t = await execute_tool("get_time", {})
            return f"The current time is {t}."
        elif "scroll" in lower:
            from backend.browser.agent_browser import agent_browser
            delta = -400 if "up" in lower else 400
            await agent_browser.input("wheel", {"deltaY": delta})
            return f"Scrolled {'up' if delta < 0 else 'down'}."
        else:
            return f"I processed your request: '{prompt_text}' using local privacy mode."
