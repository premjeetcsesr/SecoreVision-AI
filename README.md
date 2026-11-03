# SecureVision AI — Privacy Shield & Deployable Agent

Autonomous AI Agent & On-Screen Privacy Shield with zero client data leakage, real-time Gemini directives, and deployable FastAPI microservice backend.

---

## 📂 Semantic Folder Structure (Clean Architecture)

```text
secxurevision ai/
├── backend/                      # Production Deployable Python Backend (FastAPI)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # Application entrypoint & CORS middleware
│   │   ├── config.py             # Dynamic settings (API Key, Assistant Name, Env)
│   │   ├── routers/              # Modular API Endpoints
│   │   │   ├── __init__.py
│   │   │   ├── ai.py             # /ask, /briefing, /analyze, screen explain
│   │   │   ├── config.py         # /api/config, /api/config/key, /api/config/name
│   │   │   └── system.py         # /health, /metrics (system telemetry)
│   │   └── services/             # Core Business Logic
│   │       ├── __init__.py
│   │       ├── gemini_service.py # Direct Gemini API caller with key-expiry detection
│   │       └── metrics_service.py# System telemetry service
│   ├── Dockerfile                # Production Docker container (Cloud Run, Render, VPS)
│   ├── requirements.txt          # Lightweight production dependencies
│   ├── .env.example              # Environment variables template
│   ├── Procfile                  # Cloud PaaS entrypoint (Railway, Render, Heroku)
│   ├── run.py                    # Production Uvicorn launcher
│   └── agent_server.py           # Backward-compatibility launcher
├── extension/                    # Pure Chrome Extension (Manifest V3)
│   ├── assets/                   # Icons and extension styles
│   │   ├── content.css
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── privacy/                  # Client-side PII detector, redactor
│   │   ├── face-detector.js
│   │   ├── pii-detector.js
│   │   └── redactor.js
│   ├── storage/                  # IndexedDB persistent vault
│   │   └── indexeddb-vault.js
│   ├── vision/                   # In-page vision model helpers
│   │   └── vision-model.js
│   ├── background.js             # Service worker
│   ├── content.js                # DOM scanner and in-page shield
│   ├── manifest.json             # Manifest V3 specification
│   ├── popup.html                # Agent HUD (No bot mascot; includes Settings tab)
│   ├── popup.css                 # Clean modern UI stylesheet
│   └── popup.js                  # Extension controller with live key validation
├── Run_Backend.bat               # 1-Click Local Dev Launcher
└── README.md                     # Documentation & Deployment Guide
```

---

## 🔑 Dynamic API Key Input & Expiration Handling

Aapko code me ya files me API key hardcode karne ki zaroorat nahi hai:
1. Extension popup kholein aur **⚙️ Settings** tab par click karein.
2. Apni Google Gemini API key paste karein aur **"Save & Test Key"** par click karein.
3. Extension backend ke through key ko live Google API ke sath verify karega:
   - **Agar key active hai**: `✓ Gemini API Key successfully verified and connected!`
   - **Agar key expire ho gayi ya invalid hai**: Screen par turant clear alert aayega: `⚠️ Gemini API Key expired or invalid! Click here to update.`
4. Aap jab chahein Settings tab se nayi key paste karke 1-click me update kar sakte hain bina kisi server restart ke!

---

## 🏷️ Custom Assistant Name

Extension kisi rigid bot par depend nahi karta. Aap assistant ka name customize kar sakte hain:
- Settings tab me **AI Assistant Name** field me apna pasandida name enter karein (e.g. `SecureVision AI`, `JARVIS`, `Nova`, ya koi bhi name).
- **"Save Name"** par click karein. AI ab usi identity ke sath Hindi aur English dono bhashaon me baat karega.

---

## 🚀 How to Deploy the Backend (Python FastAPI)

Backend ko lightweight aur container-ready banaya gaya hai. Aap ise kisi bhi cloud platform par deploy kar sakte hain:

### Option 1: Docker (Cloud Run, AWS, VPS)
```bash
cd backend
docker build -t securevision-backend .
docker run -p 8000:8000 -e PORT=8000 securevision-backend
```

### Option 2: Render / Railway / Heroku
1. Repository ko GitHub par push karein.
2. Render / Railway par **New Web Service** banayein.
3. Root directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python run.py` (ya `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)

### Option 3: Local Run
Simply double click **`Run_Backend.bat`** (ya `python -B backend/run.py`).

---

## 🌐 Connecting Deployed Backend to Chrome Extension

Jab aapka backend cloud par live ho jaye (e.g. `https://my-backend.onrender.com`):
1. Extension popup kholein -> **⚙️ Settings** tab me jayein.
2. **Backend Server URL** field me apna cloud URL enter karein:
   ```text
   https://my-backend.onrender.com
   ```
3. **"Connect Server"** par click karein. Extension turant aapke deployed cloud backend se connect ho jayega!
