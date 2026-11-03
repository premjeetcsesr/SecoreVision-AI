# 🛡️ SecureVision AI — Privacy Shield & Deployable Vision Agent

> **An intelligent, on-screen privacy shield that prevents sensitive personal data (credit cards, passwords, emails, phone numbers, faces) from leaking to AI models and screen grabbers, applying real-time visual masks with 100% client-side privacy.**

---

## 📸 Screenshots Overview (Place Your Screenshots Here)

You can save your screenshots inside the `screenshots/` directory. Each section in this guide includes a dedicated placeholder:

| Feature / Screen | Screenshot Placeholder |
| :--- | :--- |
| **1. Master Extension Dashboard** | `![Extension HUD Dashboard](screenshots/1-dashboard-live-shield.png)` |
| **2. Live Screen Masking (Blur / Blackout)** | `![Screen Masking In Action](screenshots/2-screen-masking-live.png)` |
| **3. Local Browser Vault (Encrypted Sandbox)** | `![Local Vault Records](screenshots/3-local-vault.png)` |
| **4. AI Directives & Voice Chat Console** | `![AI Directives Console](screenshots/4-ai-directives-console.png)` |
| **5. Settings & Live Gemini API Key Validation** | `![Settings & API Key Validation](screenshots/5-settings-api-key.png)` |
| **6. Backend Server Terminal** | `![Backend Server Terminal](screenshots/6-backend-terminal.png)` |

---

## 🌟 What is SecureVision AI? (Explained for Everyone)

When we share our screen or use modern AI desktop agents (like ChatGPT screen readers, automated crawlers, or vision models), our open browser tabs often contain sensitive personal information:

- 💳 **Credit & Debit Card Numbers, Expiry Dates, and CVV Codes**
- 🔑 **Passwords, Secret API Keys, and Authentication Tokens**
- ✉️ **Personal and Business Email Addresses**
- 📞 **Mobile Phone & WhatsApp Numbers**
- 🪪 **National ID Numbers (SSN, Aadhaar, PAN Cards, Passports)**
- 👤 **Human Faces, Avatars, and User Profile Pictures**

If this information is sent across the internet to AI vision servers, personal data can be intercepted, logged, or permanently stored in external databases.

### 🛡️ How SecureVision AI Protects You

1. **Client-Side First (Privacy Before AI)**:  
   Before any webpage image or text is shared with an AI agent, SecureVision AI inspects the webpage locally inside your browser.
2. **Physical On-Screen Masking**:  
   The extension places impenetrable physical shields (**Blackout, Deep Blur, Pixelate, or Synthetic Tokens**) directly on top of sensitive screen areas. If an AI takes a screenshot or records your screen, it only sees the blurred/blacked-out mask—never your real private data.
3. **Zero Data Leakage (100% Local)**:  
   Your unmasked personal information is never uploaded to any cloud server or company database.
4. **Local Browser Vault**:  
   Detected items are stored strictly inside your browser's secure sandbox (**IndexedDB**). Only you have access, and you can export or clear this data at any time.
5. **Bilingual Conversational AI Assistant**:  
   Includes a built-in voice and text agent that communicates in both **English and Hindi** with a realistic male voice, summaries of webpages, and offline memory notes.

---

## 📑 Table of Contents

1. [Quick Start — 2-Minute Setup Guide](#-quick-start--2-minute-setup-guide)
2. [How to Install the Chrome Extension (Step-by-Step)](#-how-to-install-the-chrome-extension)
3. [Extension Features & User Guide](#-extension-features--user-guide)
   - [Tab 1: Live Shield & Screen Scanner](#1-live-shield--screen-scanner)
   - [Tab 2: Local Browser Vault (Zero-Leak Sandbox)](#2-local-browser-vault-zero-leak-sandbox)
   - [Tab 3: Security & Audit Log](#3-security--audit-log)
   - [Tab 4: AI Directives & Voice Chat Console](#4-ai-directives--voice-chat-console)
   - [Tab 5: Settings, API Key & Assistant Customization](#5-settings-api-key--assistant-customization)
4. [How to Get a Free Google Gemini API Key](#-how-to-get-a-free-google-gemini-api-key)
5. [Cloud Deployment Guide (Render, Railway, Docker, VPS)](#-cloud-deployment-guide)
6. [Folder Structure (Clean Architecture)](#-folder-structure)
7. [Troubleshooting & Frequently Asked Questions (FAQs)](#-troubleshooting--faqs)

---

## 🚀 Quick Start — 2-Minute Setup Guide

No complex programming or advanced setup required. Just follow these two simple steps:

### Step 1: Start the Backend Server (1-Click)

1. Navigate to this project folder.
2. Double-click the **`Run_Backend.bat`** file.
3. A terminal window will open with the following message:
   ```text
   ========================================================
     SecureVision AI - Production Deployable Backend
   ========================================================
   Starting server on http://127.0.0.1:8000 ...
   Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
   ```
4. Keep this terminal window open in the background (you can minimize it).

> 📷 **Screenshot Placeholder 1 (Backend Terminal):**  
> `![Backend Server Terminal Running](screenshots/6-backend-terminal.png)`  
> *(Insert a screenshot of the terminal window after running `Run_Backend.bat`)*

---

### Step 2: How to Install the Chrome Extension

1. Open your **Google Chrome** browser.
2. Type the following in your URL address bar:
   ```text
   chrome://extensions
   ```
   and press **Enter**.
3. In the top-right corner, toggle the **"Developer mode"** switch to **ON**.
4. In the top-left corner, click the **"Load unpacked"** button.
5. In the file picker, select the **`extension`** folder from this project and click **Select Folder**.
6. The **"SecureVision AI — Privacy Shield & Agent"** extension card will appear in your extensions list!
7. Click the Chrome puzzle piece 🧩 icon in the top toolbar and **Pin 📌** SecureVision AI for easy 1-click access.

> 📷 **Screenshot Placeholder 2 (Chrome Extensions Page):**  
> `![Loading Extension in Chrome](screenshots/chrome-extensions-install.png)`  
> *(Insert a screenshot of `chrome://extensions` showing Developer Mode ON and the loaded extension)*

---

## 🎯 Extension Features & User Guide

Click the SecureVision AI extension icon in your browser toolbar to open the **Cyber HUD Dashboard**. The extension is organized into 5 clean, intuitive tabs:

---

### 1. Live Shield & Screen Scanner

This is your main privacy defense hub.

> 📷 **Screenshot Placeholder 3 (Live Shield HUD):**  
> `![Live Shield Tab View](screenshots/1-dashboard-live-shield.png)`  
> *(Insert a screenshot of the Live Shield tab showing the toggle switch and the 6 detection counters)*

#### Key Controls & Actions:
1. **Master Screen Shield Toggle**:
   - Turn this switch **ON** to activate active screen protection. The status badge will change to a green `ZERO LEAK ACTIVE ✓`.
   - An in-page toast notification will confirm: `🛡️ Screen Shield ACTIVE`.
2. **Scan & Shield Screen Button**:
   - Performs a complete scan of the active viewport.
   - If the Master Shield was turned off, clicking this button automatically turns the shield **ON** and immediately masks all detected sensitive data on screen.
3. **Screen Mask Technique (4 Protection Styles)**:
   - ⬛ **Blackout**: 100% opaque black shields that completely block AI vision models, OCR engines, and screen recorders.
   - 💧 **Deep Blur**: Heavy Gaussian blur filter that cleanly obscures data while maintaining clean page readability.
   - 🟪 **Pixelate**: Mosaic-style pixel blocks that obscure characters.
   - 🏷️ **Semantic**: Replaces sensitive data with synthetic category tags (e.g., `[PROTECTED_CARD]`, `[PROTECTED_EMAIL]`).
4. **Detected Sensitive Items Grid (6 Real-Time Counters)**:
   - 💳 **Cards & CVV**: Credit card and payment card numbers.
   - 🔑 **Passwords & Keys**: Passwords, API tokens, secret credentials.
   - ✉️ **Emails**: Email addresses.
   - 📞 **Phone Numbers**: Mobile telephone and WhatsApp numbers.
   - 🪪 **SSN / Aadhaar / ID**: Government national identification numbers.
   - 👤 **Detected Faces**: User profile photos, headshots, and faces.
5. **Save to Vault Button**:
   - Safely saves all detected items into your browser's private local vault without sending any data over the internet.

> 📷 **Screenshot Placeholder 4 (On-Screen Masking in Action):**  
> `![Website Screen Masking Live](screenshots/2-screen-masking-live.png)`  
> *(Insert a screenshot showing real webpage elements like cards or emails masked with Blackout or Blur)*

---

### 2. Local Browser Vault (Zero-Leak Sandbox)

All detected sensitive records are stored strictly in your browser's private sandbox storage (**IndexedDB & chrome.storage.local**).

> 📷 **Screenshot Placeholder 5 (Local Vault View):**  
> `![Local Browser Storage Vault](screenshots/3-local-vault.png)`  
> *(Insert a screenshot of the Local Vault tab showing stored masked records)*

- **Zero Cloud Leakage**: No data leaves your machine.
- **Search & Category Filter**: Filter records by category (Cards, Passwords, Emails, Phones, IDs, Faces) or search by domain name.
- **Export JSON**: Download your secured records as a structured JSON file with 1 click.
- **Clear Vault**: Permanently delete all local records whenever you wish.

---

### 3. Security & Audit Log

Displays a chronological security timeline:
- Timestamped shield activations and pauses.
- Number of sensitive items detected and shielded on each page.
- Masking techniques applied.
- Verification that zero unmasked data was transmitted externally.

---

### 4. AI Directives & Voice Chat Console

Communicate directly with your AI assistant using either voice or text!

> 📷 **Screenshot Placeholder 6 (AI Directives Console):**  
> `![AI Directives Console](screenshots/4-ai-directives-console.png)`  
> *(Insert a screenshot of the AI Directives tab showing chat history and quick directive chips)*

#### Voice & Conversational Features:
- 🌐 **Language Selector**: Switch between `Hindi (Indian) हिन्दी` and `English (Indian/US)`.
- 🎤 **Voice Input (STT)**: Click the microphone icon and speak your directives:
  - *"Summarize this active page"*
  - *"Check system status and hardware health"*
  - *"Show my saved notes"*
  - *"Audit this screen for privacy leaks"*
- 🔊 **Neural Voice Output (TTS)**: Features high-fidelity neural audio powered by Microsoft EdgeTTS (**hi-IN-MadhurNeural** for Hindi, **en-US-GuyNeural** for English).
- ⚡ **Quick Directive Chips**: 1-click shortcuts: `📊 Status`, `📝 Notes`, `📑 Page Summary`, `🛡️ Shield Audit`.
- ⛶ **Fullscreen / Expand [F11]**: Click the expand button in the top-right corner to open the extension in a full browser tab for uninterrupted, hands-free conversational voice loops!

---

### 5. Settings, API Key & Assistant Customization

Full flexibility to customize your assistant and connect cloud backends.

> 📷 **Screenshot Placeholder 7 (Settings Tab):**  
> `![Settings Tab View](screenshots/5-settings-api-key.png)`  
> *(Insert a screenshot of the Settings tab showing the API Key input and Assistant Name field)*

1. **🔑 Google Gemini API Key**:
   - Paste your Google Gemini API key and click **"Save & Test Key"**.
   - The backend validates the key live against Google servers:
     - **Active Key**: `✓ Gemini API Key successfully verified and connected!`
     - **Expired or Invalid Key**: A clear alert warns you so you can paste a fresh key.
2. **🏷️ Custom AI Assistant Name**:
   - Customize your AI's name to whatever you prefer: `SecureVision AI`, `JARVIS`, `Friday`, `Nova`, etc.
   - Click **"Save Name"**. The assistant immediately adopts this identity in all conversations.
3. **🌐 Backend Server URL**:
   - Default for local development: `http://127.0.0.1:8000`.
   - If deployed to the cloud (Render, Railway, Cloud Run), paste your cloud URL and click **"Connect Server"**!

---

## 🔑 How to Get a Free Google Gemini API Key

Google provides free access to the Gemini API with no credit card required:

1. Open your browser and go to **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**.
2. Sign in with your standard Google (Gmail) account.
3. Click the blue button: **"Create API key"**.
4. Select **"Create API key in new project"**.
5. Copy the generated key (starts with `AIzaSy...`).
6. In the SecureVision AI extension popup, open **⚙️ Settings**, paste your key, and click **"Save & Test Key"**.
7. That's it! Your AI Assistant is now fully connected.

> 📷 **Screenshot Placeholder 8 (Google AI Studio Key Creation):**  
> `![Google AI Studio API Key Creation](screenshots/gemini-api-key-setup.png)`  
> *(Insert a screenshot showing the API key created in Google AI Studio)*

---

## 🌐 Cloud Deployment Guide

You can host the Python FastAPI backend on cloud platforms so your extension can connect from any computer without running Python locally.

### Option 1: Deploy on Render.com (Free)
1. Push this project to your GitHub account.
2. Create an account at [Render.com](https://render.com) and click **New Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python run.py`
5. Click **Deploy Web Service**. Render will assign you a live HTTPS URL:
   ```text
   https://securevision-ai-backend.onrender.com
   ```
6. Paste this URL into the extension's **⚙️ Settings -> Backend Server URL** and click **"Connect Server"**!

### Option 2: Docker Container (Cloud Run / AWS / VPS)
```bash
cd backend
docker build -t securevision-backend .
docker run -p 8000:8000 -e PORT=8000 securevision-backend
```

### Option 3: Local Windows Execution
Simply double-click:
```cmd
Run_Backend.bat
```

---

## 📂 Folder Structure

```text
SecoreVision-AI/
├── backend/                      # Production Python FastAPI Microservice
│   ├── app/
│   │   ├── main.py               # Application entrypoint & CORS configuration
│   │   ├── config.py             # Dynamic settings (API Key, Assistant Name, Env)
│   │   ├── routers/              # Modular API Endpoints
│   │   │   ├── ai.py             # Directives, EdgeTTS voice, page summary, vision planner
│   │   │   ├── config.py         # Dynamic key validation & settings persistence
│   │   │   ├── memory.py         # User notes & persistent memory storage
│   │   │   └── system.py         # Health checks & system telemetry
│   │   └── services/
│   │       ├── gemini_service.py # Direct Gemini API caller with key-expiry detection
│   │       ├── memory_service.py # Local JSON memory engine
│   │       └── metrics_service.py# CPU, RAM, Network telemetry monitor
│   ├── Dockerfile                # Production container specification
│   ├── requirements.txt          # Python dependencies
│   └── run.py                    # Production Uvicorn launcher
├── extension/                    # Pure Chrome Extension (Manifest V3)
│   ├── assets/                   # Extension icons & stylesheet
│   ├── privacy/                  # Client-side Privacy & PII Scanner
│   │   ├── pii-detector.js       # Credit cards, passwords, emails, phones, SSN detector
│   │   ├── face-detector.js      # On-device face & avatar detection
│   │   └── redactor.js           # Client canvas masking engine
│   ├── storage/
│   │   └── indexeddb-vault.js    # Browser-side zero-leak IndexedDB vault
│   ├── vision/
│   │   └── vision-model.js       # Client WebGPU/WASM vision helpers
│   ├── manifest.json             # Manifest V3 specification
│   ├── popup.html                # Main Extension HUD Window
│   ├── popup.css                 # Cyber-Shield dark UI theme
│   ├── popup.js                  # Extension controller (key validation, tabs, scanner)
│   ├── content.js                # In-page DOM scanner & visual shield overlays
│   └── background.js             # Service worker & cloud router
├── screenshots/                  # Folder to store your project screenshots
├── Run_Backend.bat               # 1-Click Windows Backend Launcher
└── README.md                     # You are reading this file
```

---

## ❓ Troubleshooting & FAQs

### Q1: The extension says "0 items detected" or does not mask on my current tab. Why?
- **Cause**: Chrome security strictly forbids browser extensions from running scripts on internal browser pages (such as `chrome://extensions`, `chrome://settings`, or empty `about:blank` tabs).
- **Solution**: Open any regular webpage (such as [google.com](https://www.google.com), [amazon.com](https://www.amazon.com), or any online form) and click **"Scan & Shield Screen"**. The shield will immediately detect sensitive items and apply visual masks.

### Q2: I just installed or reloaded the extension, but existing open tabs are not shielded.
- **Solution**: When an extension is first loaded or updated in Chrome, existing open tabs must be refreshed once (press **F5** or click **Reload**). All newly opened tabs and links are protected automatically.

### Q3: Why does the API key show "Invalid Key" or "Wrong Format"?
- **Solution**: Google Gemini API keys always begin with `AIzaSy...` and are at least 39 characters long.
  - Ensure you copied the entire key without extra quotes or spaces.
  - Do not use keys from other providers (such as OpenAI keys starting with `sk-...`).
  - Generate a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Q4: The voice microphone does not respond or the popup closes when I speak.
- **Solution**: In Chrome, extension popups can close if an operating system permission prompt appears. To enable seamless, continuous voice chat, click the **⛶ (Fullscreen / Full Tab)** button in the top-right corner of the popup. This opens the HUD in a full browser tab where microphone permissions persist permanently.

### Q5: Is my sensitive data sent to external cloud servers?
- **No, absolutely not.** SecureVision AI is architected from the ground up on **Zero-Leak Client-Side Privacy**:
  - Scanning and masking occur entirely inside your browser before any data is processed.
  - Only masked, sanitized context is ever made available to the AI agent.
  - Passwords and card numbers remain strictly within your browser's encrypted local sandbox storage.

---

## 🔒 Security & Privacy Manifesto

> *"Privacy is a fundamental human right. No AI agent, vision model, or screen grabber should have unrestricted access to your private screen data without explicit consent and impenetrable masking."*

SecureVision AI empowers you to leverage autonomous AI capabilities with confidence, security, and peace of mind.

---

*Engineered with precision for Privacy, Security, and Autonomous AI Pair Programming.*
