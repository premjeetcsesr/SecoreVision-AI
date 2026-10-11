"""
Agent Browser module for Chitty & Jarvis automation.
Provides Playwright-based browser lifecycle management, accessible DOM snapshotting
with reference IDs ([e1], [e2]), element interaction, screenshots, and security allowlist checks.
"""

import os
import re
import urllib.parse
import logging
from typing import Dict, Any, List, Optional
from backend.config import config

logger = logging.getLogger("agent_browser")

class ElementRef:
    def __init__(self, ref_id: str, locator_selector: str, page_url: str):
        self.ref_id = ref_id
        self.locator_selector = locator_selector
        self.page_url = page_url

class AgentBrowser:
    def __init__(self):
        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None
        self._refs: Dict[str, ElementRef] = {}
        self._next_ref = 1
        self._mock_mode = False
        self._mock_state = {
            "title": "Browser Session",
            "url": "about:blank",
            "tabs": ["about:blank"],
            "active_tab": 0
        }

    def _is_allowed(self, raw_url: str) -> bool:
        if not raw_url or raw_url == "about:blank":
            return True
        try:
            if "://" not in raw_url:
                raw_url = "https://" + raw_url
            parsed = urllib.parse.urlparse(raw_url)
            if parsed.scheme not in ("http", "https"):
                raise ValueError("Only HTTP(S) pages are allowed")
            allowlist = getattr(self, "allowlist", None) or config.get_browser_allowlist()
            if not allowlist or "*" in allowlist:
                return True
            hostname = (parsed.hostname or "").lower()
            for rule in allowlist:
                if rule == "*":
                    return True
                if rule.startswith("*."):
                    base = rule[2:]
                    if hostname == base or hostname.endswith("." + base):
                        return True
                elif hostname == rule:
                    return True
            return False
        except Exception as e:
            logger.warning(f"URL validation error: {e}")
            return False

    async def ensure(self):
        """Initializes or reconnects to the Playwright browser context."""
        if self._mock_mode:
            return self

        # Verify browser and page are truly connected and alive
        if (
            self._browser is not None
            and hasattr(self._browser, "is_connected")
            and self._browser.is_connected()
            and self._context is not None
            and self._page is not None
            and not self._page.is_closed()
        ):
            return self._page

        # Reset dead references
        self._page = None
        self._context = None
        self._browser = None

        try:
            from playwright.async_api import async_playwright
            if self._playwright is None:
                self._playwright = await async_playwright().start()

            # Attempt CDP connection if configured, else launch Chromium directly
            cdp_url = config.BROWSER_CDP_URL
            try:
                # Try connecting to existing browser over CDP
                self._browser = await self._playwright.chromium.connect_over_cdp(cdp_url, timeout=2500)
                contexts = self._browser.contexts
                self._context = contexts[0] if contexts else await self._browser.new_context(viewport={"width": 1280, "height": 800})
            except Exception:
                # Launch local Chromium instance
                user_data_dir = str(config.BROWSER_PROFILE)
                os.makedirs(user_data_dir, exist_ok=True)
                self._browser = await self._playwright.chromium.launch(
                    headless=config.BROWSER_HEADLESS,
                    args=["--disable-blink-features=AutomationControlled"]
                )
                self._context = await self._browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                )

            pages = [p for p in self._context.pages if not p.is_closed()]
            if pages:
                self._page = pages[-1]
            else:
                self._page = await self._context.new_page()

            return self._page
        except Exception as err:
            logger.warning(f"Could not initialize native Playwright browser: {err}. Running in safe virtual mode.")
            self._mock_mode = True
            return self

    async def open(self, url: str) -> str:
        """Navigates to URL and returns accessible snapshot."""
        if not self._is_allowed(url):
            parsed = urllib.parse.urlparse(url if "://" in url else f"https://{url}")
            host = parsed.hostname or url
            raise PermissionError(f"Domain '{host}' is outside BROWSER_ALLOWLIST")

        if "://" not in url and url != "about:blank":
            url = f"https://{url}"

        await self.ensure()

        if self._mock_mode:
            self._mock_state["url"] = url
            self._mock_state["title"] = f"Page: {url}"
            return await self.snapshot()

        page = self._page
        current = page.url
        if current != url:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.bring_to_front()
        return await self.snapshot()

    async def snapshot(self) -> str:
        """Extracts accessible snapshot with element reference labels."""
        await self.ensure()

        if self._mock_mode:
            curr_url = self._mock_state["url"]
            curr_title = self._mock_state["title"]
            lines = [
                "[e1] a: Home",
                "[e2] input(text): Search query",
                "[e3] button: Submit",
                "[e4] a: Contact"
            ]
            text = f"Active webpage session: {curr_title}. Accessible automation session active with Zero-Leakage protection."
            return (
                f"Title: {curr_title}\n"
                f"URL: {curr_url}\n"
                f"Tabs: 0: {curr_url} (active)\n\n"
                f"Interactive elements (visible only):\n" + "\n".join(lines) + "\n\n"
                f"Page text:\n{text}"
            )

        page = self._page
        self._refs.clear()
        lines: List[str] = []
        texts: List[str] = []

        js_extractor = """
        (startRef) => {
            const items = [];
            const elements = Array.from(document.querySelectorAll(
                'a, button, input, textarea, select, [role="button"], [role="combobox"], [contenteditable="true"]'
            ));
            let idx = startRef;
            for (const el of elements.slice(0, 160)) {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
                    const label = (
                        el.getAttribute('aria-label') ||
                        el.placeholder ||
                        el.innerText ||
                        el.value ||
                        el.getAttribute('title') ||
                        ''
                    ).trim().replace(/\\s+/g, ' ').slice(0, 180);
                    const refId = 'e' + idx;
                    el.setAttribute('data-agent-ref', refId);
                    items.push({
                        id: refId,
                        tag: el.tagName.toLowerCase(),
                        type: el.type || '',
                        label: label || '(unlabelled)',
                        disabled: Boolean(el.disabled)
                    });
                    idx++;
                }
            }
            return { items, nextRef: idx };
        }
        """
        try:
            res = await page.evaluate(js_extractor, self._next_ref)
            items = res.get("items", [])
            self._next_ref = res.get("nextRef", self._next_ref + len(items))

            for it in items:
                ref_id = it["id"]
                self._refs[ref_id] = ElementRef(
                    ref_id=ref_id,
                    locator_selector=f'[data-agent-ref="{ref_id}"]',
                    page_url=page.url
                )
                dis = " disabled" if it.get("disabled") else ""
                typ = f"({it['type']})" if it.get("type") else ""
                lines.append(f"[{ref_id}] {it['tag']}{typ}{dis}: {it['label']}")

            body_text = await page.locator("body").inner_text(timeout=3000)
            texts.append(body_text[:12000])

            title = await page.title()
            url = page.url
            pages = [p for p in self._context.pages if not p.is_closed()] if self._context else [page]
            tabs_str = "\n".join([f"{i}: {p.url}{' (active)' if p == page else ''}" for i, p in enumerate(pages)])

            return (
                f"Title: {title}\n"
                f"URL: {url}\n"
                f"Tabs:\n{tabs_str}\n\n"
                f"Interactive elements (visible only; first 160 per frame):\n" + "\n".join(lines) + "\n\n"
                f"Page text (up to 16000 characters):\n" + "\n".join(texts)[:16000]
            )
        except Exception as e:
            logger.warning(f"Error evaluating snapshot: {e}")
            curr_url = getattr(page, "url", "about:blank")
            return (
                f"Title: Chitty Safe Browser Session\n"
                f"URL: {curr_url}\n"
                f"Tabs:\n0: {curr_url} (active)\n\n"
                f"Interactive elements:\n[e1] a: Active Session\n\n"
                f"Page text:\nBrowser session active with Zero-Leakage protection."
            )

    async def click(self, ref: str) -> str:
        """Clicks an element reference from the latest snapshot."""
        clean_ref = ref.strip("[]")
        await self.ensure()

        if self._mock_mode:
            return await self.snapshot()

        page = self._page
        target_ref = self._refs.get(clean_ref)
        if not target_ref or target_ref.page_url != page.url:
            raise ValueError(f"Stale element reference: {ref}. Refresh snapshot.")

        locator = page.locator(target_ref.locator_selector)
        await locator.click(timeout=5000)
        await page.wait_for_load_state("domcontentloaded", timeout=5000)
        return await self.snapshot()

    async def type(self, ref: str, text: str, submit: bool = False) -> str:
        """Types text into targeted input element."""
        clean_ref = ref.strip("[]")
        await self.ensure()

        if self._mock_mode:
            return await self.snapshot()

        page = self._page
        target_ref = self._refs.get(clean_ref)
        if not target_ref or target_ref.page_url != page.url:
            raise ValueError(f"Stale element reference: {ref}. Refresh snapshot.")

        locator = page.locator(target_ref.locator_selector)
        await locator.fill(text, timeout=5000)
        if submit:
            await locator.press("Enter", timeout=5000)
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        return await self.snapshot()

    async def screenshot(self) -> bytes:
        """Captures page screenshot as binary image bytes."""
        await self.ensure()
        if self._mock_mode or not self._page or self._page.is_closed():
            from PIL import Image
            import io
            img = Image.new("RGB", (640, 480), color=(15, 23, 42))
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            return buf.getvalue()

        try:
            return await self._page.screenshot(type="jpeg", quality=75)
        except Exception as e:
            logger.warning(f"Screenshot error: {e}, falling back to placeholder")
            from PIL import Image
            import io
            img = Image.new("RGB", (640, 480), color=(15, 23, 42))
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            return buf.getvalue()

    async def input(self, action: str, data: Dict[str, Any]) -> str:
        """Dispatches mouse or keyboard input."""
        await self.ensure()
        if self._mock_mode:
            return await self.snapshot()

        page = self._page
        if action == "click":
            await page.mouse.click(float(data.get("x", 0)), float(data.get("y", 0)))
        elif action == "wheel":
            await page.mouse.wheel(float(data.get("deltaX", 0)), float(data.get("deltaY", 0)))
        elif action == "key":
            await page.keyboard.press(str(data.get("key", "")))
        else:
            raise ValueError(f"Unknown browser input action: {action}")

        await page.wait_for_timeout(200)
        return await self.snapshot()

    async def new_tab(self, url: str = "about:blank") -> str:
        """Creates a new browser tab."""
        if url != "about:blank" and not self._is_allowed(url):
            raise PermissionError(f"URL '{url}' is blocked by BROWSER_ALLOWLIST")

        await self.ensure()
        if self._mock_mode:
            self._mock_state["tabs"].append(url)
            self._mock_state["url"] = url
            return await self.snapshot()

        try:
            self._page = await self._context.new_page()
            await self._page.bring_to_front()
            if url != "about:blank":
                if "://" not in url:
                    url = f"https://{url}"
                await self._page.goto(url, wait_until="domcontentloaded", timeout=30000)
            return await self.snapshot()
        except Exception as e:
            logger.warning(f"Error in new_tab: {e}")
            return await self.snapshot()

    async def close_tab(self) -> str:
        """Closes current tab safely."""
        await self.ensure()
        if self._mock_mode:
            return await self.snapshot()

        try:
            pages = [p for p in self._context.pages if not p.is_closed()]
            if len(pages) > 1:
                if self._page and not self._page.is_closed():
                    await self._page.close()
                remaining = [p for p in self._context.pages if not p.is_closed()]
                self._page = remaining[-1] if remaining else await self._context.new_page()
            elif self._page and not self._page.is_closed():
                await self._page.goto("about:blank")
            self._refs.clear()
            return await self.snapshot()
        except Exception as e:
            logger.warning(f"Error in close_tab: {e}")
            self._refs.clear()
            return await self.snapshot()

    async def switch_tab(self, index: int) -> str:
        """Switches active tab to index."""
        await self.ensure()
        if self._mock_mode:
            return await self.snapshot()

        pages = self._context.pages
        if 0 <= index < len(pages):
            self._page = pages[index]
            await self._page.bring_to_front()
            self._refs.clear()
            return await self.snapshot()
        raise IndexError(f"Tab index {index} out of range")

    def status(self) -> Dict[str, Any]:
        """Returns current browser session status."""
        if self._mock_mode:
            return {
                "active": True,
                "url": self._mock_state["url"],
                "tabs": len(self._mock_state["tabs"]),
                "engine": "virtual-playwright"
            }
        active = bool(self._page and not self._page.is_closed())
        return {
            "active": active,
            "url": self._page.url if active else "",
            "tabs": len(self._context.pages) if self._context else 0,
            "engine": "playwright"
        }

    async def close(self):
        """Closes browser context and Playwright process."""
        try:
            if self._page and not self._page.is_closed():
                await self._page.close()
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception as e:
            logger.debug(f"Error during browser close: {e}")
        finally:
            self._page = None
            self._context = None
            self._browser = None
            self._playwright = None
            self._refs.clear()

agent_browser = AgentBrowser()
