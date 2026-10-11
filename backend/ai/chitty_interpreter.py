"""
Chitty Intelligent Command Interpreter
Translates natural language voice & text commands (English & Hindi) into structured,
safe, and validated browser actions with safety permission checks and domain allowlists.
"""

import os
import re
import urllib.parse
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# Action Types
ACTION_OPEN_URL = "OPEN_URL"
ACTION_SEARCH_WEB = "SEARCH_WEB"
ACTION_CLICK_ELEMENT = "CLICK_ELEMENT"
ACTION_TYPE_TEXT = "TYPE_TEXT"
ACTION_SCROLL_PAGE = "SCROLL_PAGE"
ACTION_READ_PAGE = "READ_PAGE"
ACTION_SUMMARIZE_PAGE = "SUMMARIZE_PAGE"
ACTION_STOP_SPEECH = "STOP_SPEECH"
ACTION_STOP_ACTION = "STOP_ACTION"
ACTION_CLARIFY = "CLARIFY"

class ChittyAction(BaseModel):
    action: str = Field(..., description="Action type")
    target: Optional[str] = None
    target_selector: Optional[str] = None
    target_id: Optional[str] = None
    value: Optional[Any] = None
    speech_response: str = Field(..., description="Spoken verbal response for Chitty")
    requires_confirmation: bool = False
    confirmation_message: Optional[str] = None
    is_sensitive: bool = False
    confidence: float = 0.95
    reasoning: str = ""
    clarification_prompt: Optional[str] = None

class ChittyCommandInterpreter:
    def __init__(self):
        self._load_config()

    def _load_config(self):
        # Default allowlist
        raw_allowlist = os.getenv("BROWSER_ALLOWLIST", "*")
        self.allowlist = [item.strip().lower() for item in raw_allowlist.split(",") if item.strip()]

    def is_domain_allowed(self, url_or_domain: str) -> bool:
        """Check if target URL or domain matches the allowlist."""
        if not self.allowlist or "*" in self.allowlist:
            return True
        try:
            if "://" not in url_or_domain:
                url_or_domain = "https://" + url_or_domain
            parsed = urllib.parse.urlparse(url_or_domain)
            hostname = (parsed.hostname or "").lower()
            if not hostname:
                return False
            for rule in self.allowlist:
                if rule == "*":
                    return True
                if rule.startswith("*."):
                    base = rule[2:]
                    if hostname == base or hostname.endswith("." + base):
                        return True
                elif hostname == rule:
                    return True
            return False
        except Exception:
            return False

    def _normalize_command(self, text: str) -> str:
        """Normalizes voice/text input and corrects common spelling mistakes/typos."""
        cleaned = (text or "").strip()
        norm = cleaned.lower()
        typo_map = [
            (r'\bsummrize\b', 'summarize'),
            (r'\bsummarise\b', 'summarize'),
            (r'\bsumarize\b', 'summarize'),
            (r'\bsumary\b', 'summary'),
            (r'\bpge\b', 'page'),
            (r'\bpg\b', 'page'),
            (r'\bclck\b', 'click'),
            (r'\bclik\b', 'click'),
            (r'\bscrol\b', 'scroll'),
            (r'\bdwn\b', 'down'),
            (r'\bgogle\b', 'google'),
            (r'\bgogole\b', 'google'),
            (r'\bgh\b', 'github'),
            (r'\bgthub\b', 'github'),
            (r'\bsignup\b', 'sign up'),
            (r'\bsignin\b', 'sign in'),
            (r'\blog in\b', 'login'),
            (r'\bsubmitt\b', 'submit'),
        ]
        for pattern, replacement in typo_map:
            norm = re.sub(pattern, replacement, norm, flags=re.IGNORECASE)
        return norm

    def interpret(
        self,
        command_text: str,
        page_context: Optional[Dict[str, Any]] = None,
        sanitized_dom: Optional[List[Dict[str, Any]]] = None
    ) -> ChittyAction:
        """
        Parses natural language input into validated ChittyAction.
        Supports English and Hindi natural speech patterns with typo-tolerance.
        """
        if getattr(self, "allowlist", None) is None:
            self._load_config()
        text = (command_text or "").strip()
        text_lower = self._normalize_command(text)
        dom = sanitized_dom or []

        if not text:
            return ChittyAction(
                action=ACTION_CLARIFY,
                speech_response="I didn't catch that. Please tell me what you'd like to do.",
                clarification_prompt="Please speak or type a command.",
                reasoning="Empty command received."
            )

        # 1. STOP SPEECH / BARGE-IN
        if any(p in text_lower for p in [
            "stop speaking", "shut up", "be quiet", "stop talking", "mute", "silence",
            "bolna band karo", "chup ho jao", "awaz band", "shant raho"
        ]):
            return ChittyAction(
                action=ACTION_STOP_SPEECH,
                speech_response="Stopping speech.",
                reasoning="Barge-in command to cancel text-to-speech."
            )

        # 2. STOP ACTIVE ACTION / CANCEL
        if any(p in text_lower for p in [
            "stop action", "cancel action", "cancel task", "abort", "ruk jao", "roko", "band karo"
        ]):
            return ChittyAction(
                action=ACTION_STOP_ACTION,
                speech_response="Action stopped.",
                reasoning="User commanded immediate cancellation of active automation task."
            )

        # 3. SUMMARIZE PAGE (typo-tolerant: "summrize the pge", "summarize", etc.)
        if any(w in text_lower for w in ["summarize", "summary"]) or any(p in text_lower for p in [
            "page ka summary", "is page ka summary", "kya likha hai batao", "is page ko samjhao", "page samjhao"
        ]):
            summary_points = self._generate_page_summary(page_context, dom)
            return ChittyAction(
                action=ACTION_SUMMARIZE_PAGE,
                speech_response=summary_points,
                value=summary_points,
                reasoning="Generated concise sanitized webpage summary."
            )

        # 4. READ PAGE ALOUD
        if any(p in text_lower for p in [
            "read this page", "read page aloud", "read aloud", "read content", "read page",
            "page padho", "page bolkar batao", "page sunao", "is page ko padho"
        ]):
            readable_text = self._extract_readable_content(page_context, dom)
            return ChittyAction(
                action=ACTION_READ_PAGE,
                speech_response=f"Here is the page content: {readable_text[:350]}...",
                value=readable_text[:800],
                reasoning="Extracted readable sanitized page text for speech playback."
            )

        # 5. SCROLL PAGE (UP / DOWN / TOP / BOTTOM)
        if any(p in text_lower for p in [
            "scroll down", "scroll up", "scroll to top", "scroll to bottom", "scroll",
            "niche scroll karo", "upar scroll karo", "niche jao", "upar jao"
        ]):
            if any(w in text_lower for w in ["up", "upar", "top"]):
                offset = -450
                direction_desc = "up"
            else:
                offset = 450
                direction_desc = "down"

            return ChittyAction(
                action=ACTION_SCROLL_PAGE,
                value=offset,
                target=direction_desc,
                speech_response=f"Scrolling {direction_desc}.",
                reasoning=f"Scrolled viewport {direction_desc} by {abs(offset)} pixels."
            )

        # 6. OPEN URL / NAVIGATION
        open_match = re.search(r'(?:open|go to|navigate to|launch)\s+([a-zA-Z0-9\.\-\:\/]+)', text_lower)
        hindi_open_match = re.search(r'([a-zA-Z0-9\.\-\:\/]+)\s+(?:kholo|open karo|par jao)', text_lower)
        matched_target = (open_match.group(1) if open_match else (hindi_open_match.group(1) if hindi_open_match else None))

        if matched_target and not any(k in matched_target for k in ["button", "link", "form", "page", "tab", "menu"]):
            url = matched_target.strip()
            if not url.startswith("http://") and not url.startswith("https://"):
                url = f"https://{url}"

            # Check domain allowlist
            if not self.is_domain_allowed(url):
                parsed = urllib.parse.urlparse(url)
                blocked_host = parsed.hostname or url
                return ChittyAction(
                    action=ACTION_CLARIFY,
                    target=url,
                    speech_response=f"Domain {blocked_host} is blocked by security allowlist policy.",
                    clarification_prompt=f"Domain '{blocked_host}' is not in BROWSER_ALLOWLIST. Cannot navigate.",
                    reasoning=f"Domain allowlist policy blocked navigation to {blocked_host}."
                )

            return ChittyAction(
                action=ACTION_OPEN_URL,
                target=url,
                value=url,
                speech_response=f"Opening {url}.",
                reasoning=f"Navigating to verified allowed domain {url}."
            )

        # 7. SEARCH WEB
        hindi_search_match = re.search(r'(.+?)\s+(?:search karo|khojo|dhoondo)', text, re.IGNORECASE)
        search_match = re.search(r'^(?:search for|search|lookup|find information on)\s+(.+)', text, re.IGNORECASE)
        query = (hindi_search_match.group(1) if hindi_search_match else (search_match.group(1) if search_match else None))

        if query and not any(w in query.lower() for w in ["button", "click", "input", "element", "field"]):
            query_clean = query.strip().strip('"\'')
            encoded_query = urllib.parse.quote_plus(query_clean)
            search_template = os.getenv("SEARCH_ENGINE_URL", "https://search.brave.com/search?q={query}")
            search_url = search_template.format(query=encoded_query) if "{query}" in search_template else f"{search_template}{encoded_query}"
            return ChittyAction(
                action=ACTION_SEARCH_WEB,
                target=search_url,
                value=query_clean,
                speech_response=f"Searching for '{query_clean}'.",
                reasoning=f"Constructed web search query for '{query_clean}'."
            )

        # 8. TYPE TEXT INTO INPUT
        type_match = re.search(r'(?:type|enter|write|fill)\s+["\']?([^"\']+)["\']?\s+(?:in|into|on)\s+["\']?([^"\']+)["\']?', text_lower, re.IGNORECASE)
        hindi_type_match = re.search(r'([^"\']+)\s+(?:me|par)\s+["\']?([^"\']+)["\']?\s+(?:likho|bhar do|type karo)', text_lower, re.IGNORECASE)

        if type_match:
            val_to_type = type_match.group(1).strip()
            field_name = type_match.group(2).strip()
            target_node = self._find_matching_input(field_name, dom)
            is_sensitive = self._is_field_sensitive(field_name, target_node)
            return ChittyAction(
                action=ACTION_TYPE_TEXT,
                target=field_name,
                target_selector=target_node.get("id") and f"#{target_node['id']}",
                target_id=target_node.get("agentId") or target_node.get("id"),
                value=val_to_type,
                is_sensitive=is_sensitive,
                requires_confirmation=is_sensitive,
                confirmation_message=f"Chitty is about to enter sensitive data into '{field_name}'. Allow?" if is_sensitive else None,
                speech_response=f"Typing into {field_name}." if not is_sensitive else f"Permission required to enter data into sensitive field {field_name}.",
                reasoning=f"Matched input target for '{field_name}'."
            )
        elif hindi_type_match:
            field_name = hindi_type_match.group(1).strip()
            val_to_type = hindi_type_match.group(2).strip()
            target_node = self._find_matching_input(field_name, dom)
            is_sensitive = self._is_field_sensitive(field_name, target_node)
            return ChittyAction(
                action=ACTION_TYPE_TEXT,
                target=field_name,
                target_selector=target_node.get("id") and f"#{target_node['id']}",
                target_id=target_node.get("agentId") or target_node.get("id"),
                value=val_to_type,
                is_sensitive=is_sensitive,
                requires_confirmation=is_sensitive,
                confirmation_message=f"Chitty is about to enter sensitive data into '{field_name}'. Allow?" if is_sensitive else None,
                speech_response=f"{field_name} me enter kar raha hoon." if not is_sensitive else f"{field_name} me data enter karne ke liye permission chahiye.",
                reasoning=f"Matched Hindi input target for '{field_name}'."
            )

        # 9. CLICK ELEMENT (BUTTON, LINK, TAB)
        click_match = re.search(r'(?:click|press|tap|hit|submit)\s+(?:on\s+)?(?:the\s+)?(.+)', text_lower, re.IGNORECASE)
        hindi_click_match = re.search(r'(.+?)\s+(?:par click karo|click karo|dabao|submit karo)', text_lower, re.IGNORECASE)

        raw_target = None
        if click_match:
            raw_target = click_match.group(1).strip()
        elif hindi_click_match:
            raw_target = hindi_click_match.group(1).strip()
        else:
            # Direct clickable element recognition (e.g. user says/types "Sign up", "Login", "Register", "Submit", etc.)
            common_action_buttons = ["sign up", "sign in", "login", "register", "submit", "get started", "learn more", "subscribe", "create account", "continue", "next", "checkout"]
            for btn_phrase in common_action_buttons:
                if btn_phrase in text_lower:
                    raw_target = btn_phrase
                    break

            # Or direct match with any button or link present in the active page DOM
            if not raw_target and dom:
                for node in dom:
                    node_txt = (node.get("text") or "").strip().lower()
                    if node_txt and len(node_txt) >= 3 and node_txt in text_lower:
                        if node.get("isClickable") or (node.get("tagName") or "").lower() in ["button", "a"]:
                            raw_target = node.get("text")
                            break

        if raw_target:
            raw_target = re.sub(r'\b(button|btn|link|icon|tab)\b', '', raw_target).strip()

            # Ambiguous reference check
            if raw_target in ["it", "this", "that", "something", "anything"]:
                return ChittyAction(
                    action=ACTION_CLARIFY,
                    speech_response="Which button or element would you like me to click? Please be more specific.",
                    clarification_prompt="Ambiguous click target. Please specify element name (e.g. 'Submit' or 'Login').",
                    reasoning="Ambiguous reference 'it/this/that' without specific target."
                )

            matched_node = self._find_clickable_element(raw_target, dom, full_cmd=text_lower)
            is_sensitive_submit = self._is_sensitive_action(matched_node, raw_target, dom, full_cmd=text_lower)
            node_label = matched_node.get("text") or matched_node.get("id") or raw_target or "element"
            conf_msg = f"This action submits a form with sensitive details. Do you confirm submission?" if is_sensitive_submit else None

            return ChittyAction(
                action=ACTION_CLICK_ELEMENT,
                target=node_label,
                target_selector=f"#{matched_node.get('id')}" if matched_node.get("id") else None,
                target_id=matched_node.get("agentId") or matched_node.get("id"),
                requires_confirmation=is_sensitive_submit,
                confirmation_message=conf_msg,
                is_sensitive=is_sensitive_submit,
                speech_response=f"Clicking {node_label}." if not is_sensitive_submit else f"Sensitive submission detected. Please confirm to proceed.",
                reasoning=f"Located target element '{node_label}' for click automation."
            )

        # 10. Fallback / Clarification
        return ChittyAction(
            action=ACTION_CLARIFY,
            speech_response=f"I understood: '{text}', but I need clarification. You can ask me to open a site, search, scroll, click, or summarize.",
            clarification_prompt=f"Could not safely map command: '{text}'. Try 'Open Google', 'Scroll down', 'Summarize page', or 'Click submit'.",
            confidence=0.4,
            reasoning="Command did not match known safe deterministic action patterns."
        )

    def _find_matching_input(self, field_name: str, dom: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Locates input node in DOM matching field name."""
        name_lower = field_name.lower()
        for node in dom:
            tag = (node.get("tagName") or "").lower()
            if tag in ["input", "textarea", "select"]:
                nid = (node.get("id") or "").lower()
                nname = (node.get("name") or "").lower()
                placeholder = (node.get("placeholder") or "").lower()
                text = (node.get("text") or "").lower()
                if any(name_lower in s for s in [nid, nname, placeholder, text]):
                    return node
        return {}

    def _is_field_sensitive(self, field_name: str, node: Dict[str, Any]) -> bool:
        """Determines if target input field stores sensitive credentials or PII."""
        sensitive_keywords = ["password", "pwd", "ssn", "card", "cvv", "credit", "salary", "pin", "token", "secret"]
        name_lower = field_name.lower()
        if any(k in name_lower for k in sensitive_keywords):
            return True
        node_type = (node.get("type") or "").lower()
        if node_type == "password":
            return True
        node_id = (node.get("id") or "").lower()
        return any(k in node_id for k in sensitive_keywords)

    def _find_clickable_element(self, query: str, dom: List[Dict[str, Any]], full_cmd: str = "") -> Dict[str, Any]:
        """Finds most relevant clickable element in DOM."""
        q = query.strip().lower()
        full_tokens = set(re.findall(r'[a-zA-Z0-9]+', (q + " " + full_cmd).lower()))
        if not q and not full_cmd:
            return {}

        candidates = []
        for node in dom:
            tag = (node.get("tagName") or "").lower()
            role = (node.get("role") or "").lower()
            is_clickable = node.get("isClickable") or tag in ["button", "a"] or role == "button"
            if not is_clickable:
                continue

            node_text = (node.get("text") or "").lower()
            node_id = (node.get("id") or "").lower()
            node_tokens = set(re.findall(r'[a-zA-Z0-9]+', f"{node_text} {node_id}"))

            overlap = full_tokens.intersection(node_tokens)
            score = len(overlap) * 5

            if q and (q in node_text or q in node_id):
                score += 15

            # Stem check for registration/register/submit
            for t1 in full_tokens:
                for t2 in node_tokens:
                    if len(t1) >= 4 and len(t2) >= 4 and (t1.startswith(t2[:4]) or t2.startswith(t1[:4])):
                        score += 8

            if score > 0:
                candidates.append((score, node))

        if candidates:
            candidates.sort(key=lambda x: x[0], reverse=True)
            return candidates[0][1]

        # Match submit or action button
        action_keywords = ["submit", "save", "proceed", "register", "registration", "login", "continue", "next"]
        if any(w in (q + " " + full_cmd) for w in action_keywords):
            for node in dom:
                txt = ((node.get("text") or "") + " " + (node.get("id") or "")).lower()
                if any(w in txt for w in action_keywords):
                    return node

        return {}

    def _is_sensitive_action(self, node: Dict[str, Any], query: str, dom: List[Dict[str, Any]], full_cmd: str = "") -> bool:
        """Checks if clicking an element constitutes a sensitive or high-risk submission."""
        txt = ((node.get("text") or "") + " " + (node.get("id") or "") + " " + query + " " + full_cmd).lower()
        if any(w in txt for w in ["delete", "remove", "pay", "checkout", "transfer", "purchase", "send money"]):
            return True

        if any(w in txt for w in ["submit", "register", "registration", "sign up", "save"]):
            for n in dom:
                n_type = (n.get("type") or "").lower()
                n_id = (n.get("id") or "").lower()
                if n_type == "password" or any(k in n_id for k in ["card", "ssn", "cvv", "payment", "bank", "pwd"]):
                    return True
        return False

    def _generate_page_summary(self, page_context: Optional[Dict[str, Any]], dom: List[Dict[str, Any]]) -> str:
        """Constructs concise summary of sanitized page."""
        title = page_context.get("title", "Active Webpage") if page_context else "Active Webpage"
        headings = (page_context.get("headings") or []) if page_context else []
        snippet = (page_context.get("pageSnippet") or "") if page_context else ""

        forms = [n for n in dom if n.get("tagName") == "input"]
        buttons = [n for n in dom if (n.get("tagName") or "").lower() in ["button", "a"] and n.get("text")]
        btn_labels = [b.get("text") for b in buttons[:4] if b.get("text")]

        summary_parts = [f"This page is '{title}'."]
        if headings:
            summary_parts.append(f"Main sections: {', '.join(headings[:3])}.")
        if snippet:
            summary_parts.append(f"Content: {snippet[:180]}...")
        if btn_labels:
            summary_parts.append(f"Available actions include: {', '.join(btn_labels)}.")
        elif forms:
            summary_parts.append(f"It contains {len(forms)} interactive input fields.")
        summary_parts.append("Zero-leakage privacy protection is active.")

        return " ".join(summary_parts)

    def _extract_readable_content(self, page_context: Optional[Dict[str, Any]], dom: List[Dict[str, Any]]) -> str:
        """Extracts visible sanitized text nodes for text-to-speech."""
        if page_context and page_context.get("pageSnippet"):
            return page_context.get("pageSnippet")[:800]
        texts = [n.get("text", "") for n in dom if n.get("text") and len(n.get("text", "")) > 3]
        clean_text = " ".join(texts)
        if not clean_text:
            return page_context.get("title", "Webpage content") if page_context else "Webpage content"
        return clean_text
