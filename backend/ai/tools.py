"""
Agent Tools Definition & Execution Engine.
Ported from Jarvis tools architecture to Python.
Provides safe workspace operations, math calculations, and browser automation tools.
"""

import os
import re
import datetime
import subprocess
from pathlib import Path
from typing import Dict, Any, List
from backend.config import config
from backend.browser.agent_browser import agent_browser

def _tool(name: str, description: str, properties: Dict[str, Any], required: List[str] = None):
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required or [],
                "additionalProperties": False
            }
        }
    }

TOOL_DEFINITIONS = [
    _tool("get_time", "Get the current local date and time.", {}),
    _tool("calculator", "Evaluate a mathematical expression safely.", {"expression": {"type": "string"}}, ["expression"]),
    _tool("list_files", "List files within the agent workspace.", {"path": {"type": "string", "description": "Workspace-relative directory."}}),
    _tool("read_file", "Read a UTF-8 text file in the workspace.", {"path": {"type": "string"}}, ["path"]),
    _tool("write_file", "Create or replace a UTF-8 text file in the workspace.", {"path": {"type": "string"}, "content": {"type": "string"}}, ["path", "content"]),
    _tool("run_command", "Run a non-interactive shell command in the workspace.", {"command": {"type": "string"}}, ["command"]),
    _tool("browser_open", "Open a URL in the persistent agent browser and return its accessible snapshot.", {"url": {"type": "string"}}, ["url"]),
    _tool("browser_snapshot", "Read the current page, including stable references for interactive elements.", {}),
    _tool("browser_click", "Click an element reference from the latest browser snapshot.", {"ref": {"type": "string", "description": "Reference such as e3."}}, ["ref"]),
    _tool("browser_type", "Fill a visible input. Set submit:true to submit a search with Enter.", {"ref": {"type": "string"}, "text": {"type": "string"}, "submit": {"type": "boolean"}}, ["ref", "text"]),
    _tool("browser_key", "Press a key in the active page, such as Enter, Escape, Tab, or ArrowDown.", {"key": {"type": "string"}}, ["key"]),
    _tool("browser_scroll", "Scroll the active page and return fresh references. Positive pixels scroll down.", {"pixels": {"type": "number"}}, ["pixels"]),
    _tool("browser_switch_tab", "Switch to a tab index listed in the latest snapshot.", {"index": {"type": "integer", "minimum": 0}}, ["index"]),
]

def _safe_path(input_path: str = ".") -> Path:
    ws = Path(config.AGENT_WORKSPACE).resolve()
    ws.mkdir(parents=True, exist_ok=True)
    target = (ws / input_path).resolve()
    if target != ws and ws not in target.parents:
        raise PermissionError("Path escapes the agent workspace directory sandbox")
    return target

async def execute_tool(name: str, args: Dict[str, Any]) -> str:
    """Executes a named agent tool with safety policies."""
    ws = Path(config.AGENT_WORKSPACE).resolve()
    ws.mkdir(parents=True, exist_ok=True)

    if name == "get_time":
        return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")

    elif name == "calculator":
        expr = str(args.get("expression", "")).strip()
        # Safe math evaluation using python math operations
        allowed = set("0123456789+-*/().,%^ eE")
        if not all(c in allowed for c in expr):
            raise ValueError("Expression contains unauthorized characters")
        try:
            # Safe evaluation
            val = eval(expr, {"__builtins__": None}, {})
            return str(val)
        except Exception as e:
            return f"Error evaluating expression: {e}"

    elif name == "list_files":
        target = _safe_path(str(args.get("path", ".")))
        if not target.exists():
            return "(directory does not exist)"
        entries = []
        for it in target.iterdir():
            prefix = "dir " if it.is_dir() else "file"
            entries.append(f"{prefix} {it.name}")
        return "\n".join(entries) or "(empty directory)"

    elif name == "read_file":
        target = _safe_path(str(args.get("path", "")))
        if not target.exists():
            raise FileNotFoundError(f"File not found: {args.get('path')}")
        content = target.read_text(encoding="utf-8", errors="replace")
        return content[:40000]

    elif name == "write_file":
        target = _safe_path(str(args.get("path", "")))
        target.parent.mkdir(parents=True, exist_ok=True)
        content = str(args.get("content", ""))
        target.write_text(content, encoding="utf-8")
        return f"Wrote {len(content.encode('utf-8'))} bytes to {args.get('path')}"

    elif name == "run_command":
        cmd = str(args.get("command", "")).strip()
        # Security policy
        danger_patterns = [r"\b(sudo|shutdown|reboot)\b", r"rm\s+(-[^\s]*r[^\s]*f|-[^\s]*f[^\s]*r)"]
        for pat in danger_patterns:
            if re.search(pat, cmd, re.IGNORECASE):
                raise PermissionError("Command blocked by the local safety policy")

        try:
            res = subprocess.run(
                cmd,
                shell=True,
                cwd=str(ws),
                capture_output=True,
                text=True,
                timeout=30
            )
            out = res.stdout or ""
            if res.stderr:
                out += f"\n[stderr]\n{res.stderr}"
            return (out.strip() or "(command completed without output)")[:40000]
        except subprocess.TimeoutExpired:
            return "(command timed out after 30 seconds)"
        except Exception as e:
            return f"Command execution error: {e}"

    # Browser tools delegating to agent_browser
    elif name == "browser_open":
        return await agent_browser.open(str(args.get("url", "")))

    elif name == "browser_snapshot":
        return await agent_browser.snapshot()

    elif name == "browser_click":
        return await agent_browser.click(str(args.get("ref", "")))

    elif name == "browser_type":
        return await agent_browser.type(
            str(args.get("ref", "")),
            str(args.get("text", "")),
            submit=bool(args.get("submit", False))
        )

    elif name == "browser_key":
        return await agent_browser.input("key", {"key": str(args.get("key", ""))})

    elif name == "browser_scroll":
        return await agent_browser.input("wheel", {"deltaY": float(args.get("pixels", 400))})

    elif name == "browser_switch_tab":
        return await agent_browser.switch_tab(int(args.get("index", 0)))

    else:
        raise ValueError(f"Unknown tool: {name}")
