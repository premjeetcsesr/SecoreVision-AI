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
├── privacylens/server/             # FastAPI backend (Render)
│   ├── main.py                     # API Endpoints (/analyze, /validate, /capabilities)
│   ├── schemas.py                  # Pydantic v2 data contracts
│   ├── pii_guard.py                # Server-side defense-in-depth PII scanner
│   ├── providers/                  # Gemini & Mock LLM providers
│   ├── requirements.txt
│   └── .env.example                # Backend-only local environment template
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
│   ├── background/                 # Manifest V3 service worker
│   ├── content/                    # Page content script
│   ├── services/                   # Privacy, storage, and gesture services
│   ├── shared/api.ts               # Environment-based backend URL
│   └── tests/
│       └── secureVisionCore.test.ts # Comprehensive Vitest test suite
├── public/                         # Static Vite assets and icons
├── manifest.json                   # Chrome Extension Manifest V3 configuration
├── .env.example
├── .gitignore
├── vercel.json                     # Vite dashboard / extension build
├── render.yaml                     # FastAPI backend service
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

---

## ☁️ 8. Deploy Frontend and Backend

The dashboard and FastAPI API deploy as separate services. The Chrome extension is
still built into `dist/` by the frontend build; publish it separately through the
Chrome Web Store or load that build unpacked for testing.

### Local environment

1. Copy the root `.env.example` to `.env`. Set `VITE_API_BASE_URL` to the backend
   URL. The root `.env` is ignored by Git.
2. Copy `privacylens/server/.env.example` to `privacylens/server/.env` and set
   backend-only values such as `GEMINI_API_KEY` if using Gemini.
3. Start the API from `privacylens/server` and the dashboard from the repository
   root using the Quickstart commands above.

`VITE_API_BASE_URL` is embedded in the frontend build and is public. Do not put
provider keys or other secrets in root `.env` or in any `VITE_*` variable.

### Deployment order

1. Import the repository into Vercel and keep the project root at the repository
   root. `vercel.json` configures `npm ci`, `npm run build`, and `dist`. Deploy
   once to learn the exact Vercel origin.
2. Create a Render Blueprint from this repository and select `render.yaml`.
   Set `CORS_ORIGINS` to the exact Vercel frontend origin (no trailing slash).
3. Set the Vercel environment variable `VITE_API_BASE_URL` to the Render API URL,
   for example `https://securevision-api.onrender.com`, and redeploy. Vite values
   are build-time configuration.

### Render backend

1. Optionally set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` in Render's
   environment settings. Keep API keys in Render, never in Vercel's
   `VITE_*` variables.
2. Confirm the service health check at `/health`.

After first deployment, open the dashboard Settings and use the saved
`serverEndpoint` setting if you need to override the build-time API URL.
