# 🛡️ SECUREVISION AI
### Privacy-Preserving Browser Vision Agent • HackIndia AI & CyberTech Hackathon 2026

> **Core Principle:**  
> *"AI should understand and automate browser tasks without exposing the user's sensitive visual information."*

---

## 📌 1. The Core Problem
Modern agentic AI pipelines require visual screen states and DOM access to assist users in complex digital workflows. However, conventional cloud-hosted agent architectures send unencrypted, raw browser screenshots to external servers—leaking credit cards, passwords, emails, healthcare numbers, and personal identifiers.

**SecureVision AI** introduces a **Client-Side Zero-Leakage Shield**. Lightweight vision models (WebGPU / WASM), local OCR (Tesseract.js), and heuristic PII detectors operate directly inside the user's browser to segment and **irreversibly blackout sensitive bounding boxes before any outbound network request is dispatched**.

---

## 🏛️ 2. System Architecture

```
USER
 │
 ▼
DASHBOARD (React + Vite + Tailwind CSS)
 │
 │ Natural Language Command ("Find Submit button and click it")
 ▼
CHROME EXTENSION (Manifest V3)
 │
 ├──▶ Screen Capture (Local Viewport via Chrome Tabs API)
 │
 ├──▶ DOM Context Extraction (Interactive Elements & Labels)
 │
 ├──▶ Local Vision Engine (WebGPU / WASM / ONNX Runtime Web)
 │
 ├──▶ Local OCR Engine (Tesseract.js & Regex Pattern Classifiers)
 │
 ├──▶ PII Detection Layer (Email, Phone, Password, Cards, Aadhaar/SSN)
 │
 ├──▶ Redaction Engine (Irreversible Opaque Blackout Masking on Canvas)
 │
 ├──▶ Privacy Gate (Fail-Closed Verification: 0 Raw Bytes Leaked)
 │
 │       ONLY SANITIZED CONTEXT & REDACTED FRAMES
 │                      │
 │                      ▼
 │        FASTAPI BACKEND (Python 3.13)
 │                      │
 │                      ▼
 │         AI / VLM REASONING (Gemini 2.5 Flash / OpenAI / Local VLM)
 │                      │
 │                      ▼
 │        Structured Action Plan (STRICT JSON)
 │                      │
 │                      ▼
 ├──▶ Action Validator (Viewport Bounds & Script Injection Check)
 │
 ├──▶ Human-in-the-Loop Confirmation (For Consequential Actions: Submit, Delete, Pay)
 │
 └──▶ Browser Action Executor (Virtual Cursor HUD & Synthetic Dispatch)
 │
 ▼
EXECUTION RESULT & AUDIT TIMELINE
```

---

## 🗂️ 3. Monorepo Project Structure

```
hackthone/
├── demo/
│   └── synthetic-sensitive-form/
│       └── index.html               # Safe RFC-2606 compliant testbed page
├── privacylens/server/             # FastAPI Backend Gateway
│   ├── main.py                     # API Endpoints (/analyze, /validate, /capabilities)
│   ├── schemas.py                  # Pydantic v2 data contracts
│   ├── pii_guard.py                # Server-side defense-in-depth PII scanner
│   ├── providers/                  # Gemini & Mock LLM providers
│   └── requirements.txt
├── src/
│   ├── dashboard/
│   │   ├── screens/
│   │   │   ├── Overview.tsx        # Status cards, active viewport, telemetry
│   │   │   ├── Agent.tsx           # 9-Step pipeline command center & modal
│   │   │   ├── PrivacyCenter.tsx   # PII classifiers, timeline, blackout canvas
│   │   │   ├── Vision.tsx          # Local WebGPU vision & OCR inspector
│   │   │   ├── Performance.tsx     # Latency breakdown & benchmarks
│   │   │   └── Settings.tsx        # Fail-closed toggles & API endpoints
│   │   └── DashboardShell.tsx      # Cybersecurity sidebar layout
│   ├── popup/
│   │   └── Popup.tsx               # Chrome Extension popup & hand gesture HUD
│   ├── content/
│   │   └── contentScript.ts        # DOM extraction, virtual cursor HUD, actions
│   ├── background/
│   │   └── serviceWorker.ts        # MV3 background router
│   ├── services/
│   │   ├── piiDetector.ts          # Layered regex + DOM + Luhn detector
│   │   ├── redactionEngine.ts      # Canvas 2D irreversible solid blackout masks
│   │   ├── privacyGate.ts          # Fail-closed outbound network gate
│   │   ├── actionValidator.ts      # Viewport bounds & consequential action guard
│   │   └── storage.ts              # Chrome storage & localStorage sync
│   └── tests/
│       └── secureVisionCore.test.ts # Comprehensive Vitest test suite
├── public/
│   ├── demo.html                   # Static dev preview of synthetic testbed
│   └── manifest.json               # Chrome Extension Manifest V3 configuration
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 4. Quickstart Setup Guide

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+ (tested on Python 3.13)
- Google Chrome browser

---

### Step 1: Start the FastAPI Backend Gateway
```bash
cd privacylens/server
# Virtual environment is already configured in venv/
venv\Scripts\python.exe main.py
```
*The server will start on `http://127.0.0.1:8000` with active PII Guardrails and Gemini 2.5 Flash reasoning.*

---

### Step 2: Start the SecureVision AI Dashboard
```bash
# In the repository root
npm install
npm run dev
```
*The Dashboard will be live at `http://localhost:5173`.*

---

### Step 3: Load the Chrome Extension (Manifest V3)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `dist/` directory (or workspace root containing `manifest.json`).
5. Pin **SecureVision AI** to your Chrome toolbar.

---

## 🧪 5. Testing the End-to-End Workflow

1. **Open the Synthetic Sandbox:**  
   Navigate to `http://localhost:5173/demo.html` (or click *"Launch Synthetic Sandbox"* in the dashboard).
2. **Open the Dashboard:**  
   Open `http://localhost:5173/` and navigate to the **Agent** page.
3. **Execute a Command:**  
   Enter:
   ```text
   Find the Submit button and click it.
   ```
4. **Watch the 9-Step Verification Protocol:**
   - [x] 1. Reading current webpage
   - [x] 2. Capturing screen locally via Chrome Tabs API
   - [x] 3. Detecting sensitive PII (Name, Email, Card, Password)
   - [x] 4. Applying opaque solid blackouts on `<canvas>`
   - [x] 5. Creating client-side sanitized context with typed placeholders
   - [x] 6. Privacy Gate Verification (**FAIL-CLOSED passed**)
   - [x] 7. Backend AI reasons over sanitized data
   - [x] 8. Action Validator checks bounds and flags **Consequential Action**
   - [x] 9. **Human Authorization Modal Appears:** Click `[Allow Action]` to execute!

---

## 📡 6. Backend API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns service status, provider, and active guardrails |
| `GET` | `/api/capabilities` | Returns supported actions, vision engines, and OCR features |
| `POST` | `/api/agent/analyze` | Accepts sanitized context, validates zero leakage, returns structured action plan |
| `POST` | `/api/agent/validate` | Validates action payloads against security and viewport rules |
| `POST` | `/api/telemetry` | Ephemeral, non-sensitive client performance metrics |

---

## 🔒 7. Core Security & Privacy Guarantees

1. **Zero Raw Leakage:** The original unredacted screenshot never leaves the browser.
2. **Irreversible Redaction:** Replaces sensitive bounding boxes with solid `#050b14` opaque masks—no blur or pixelation that can be mathematically reversed.
3. **Fail-Closed Privacy Gate:** Outbound requests are blocked if any unmasked entity is detected.
4. **No Code Execution:** AI returns strictly structured JSON (`{ type: "click", target: {...} }`). Arbitrary JavaScript and script tags are unconditionally blocked.
5. **Human-in-the-Loop:** Consequential operations (`Submit`, `Delete`, `Pay`, `Send`) mandate explicit user authorization before execution.

---

## 🏆 Hackathon Attribution
- **Project:** SecureVision AI
- **Event:** HackIndia AI & CyberTech Hackathon 2026
- **Architecture:** Client-Side Zero-Leakage Privacy Shield (Manifest V3 + WebGPU + FastAPI)
