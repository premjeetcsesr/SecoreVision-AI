# 🛡️ SecureVision AI — Privacy Shield & AI Vision Agent

> **Ek Aisa Smart AI Screen Shield jo aapke computer screen se koi bhi private data (Cards, Passwords, Emails, Phone Numbers, Photos) leak hone se rokkta hai aur screen par real-time blur/blackout karke 100% privacy deta hai!**

---

## 📸 Screenshots Overview (Yahan Apne Screenshots Dalein)

Aap apne extension ke screenshots lekar `screenshots/` folder me dal sakte hain. Har section ke liye niche jagah banayi gayi hai:

| Feature / Screen | Screenshot Placeholder |
| :--- | :--- |
| **1. Extension Master Dashboard** | `![Extension HUD Dashboard](screenshots/1-dashboard-live-shield.png)` |
| **2. Screen Masking (Blur / Blackout Live)** | `![Screen Masking In Action](screenshots/2-screen-masking-live.png)` |
| **3. Local Browser Vault** | `![Local Vault Records](screenshots/3-local-vault.png)` |
| **4. AI Directives & Voice Chat (Hindi/English)** | `![AI Directives Console](screenshots/4-ai-directives-console.png)` |
| **5. Settings & Free Gemini API Key** | `![Settings & API Key Validation](screenshots/5-settings-api-key.png)` |
| **6. Backend Server Running** | `![Backend Server Terminal](screenshots/6-backend-terminal.png)` |

---

## 🌟 SecureVision AI Kya Hai? (Non-Technical Explanation)

Aam taur par jab hum AI tools (jaise ChatGPT, Claude ya automated agents) ko apni screen dikhate hain, toh hamari screen par dikhne wali sensitive cheezein jaise:
- 💳 **Credit/Debit Card numbers aur CVV**
- 🔑 **Passwords, Secret API Keys aur Login Tokens**
- ✉️ **Personal Email addresses**
- 📞 **Mobile/WhatsApp numbers**
- 🪪 **Aadhaar, PAN Card, SSN aur Identity numbers**
- 👤 **Chehre (Faces) aur Profile Photos**

Yeh sab information AI ke cloud servers par chali jati hai, jisse data leak hone ka khatra hota hai.

### 🛡️ SecureVision AI Aapko Kaise Protect Karta Hai?

1. **Client-Side Protection (Pehle Parda, Phir AI)**:  
   Jaise hi aap kisi website par jate hain, SecureVision AI aapke browser ke andar hi sensitive data ko dhoondh leta hai.
2. **Screen Par Mask / Parda Lagana**:  
   Aapki screen par sensitive data par turant **Blackout (Kala parda)**, **Deep Blur (Dhundhla)**, ya **Pixelate (Mosaic)** lag jata hai. Agar koi screen record kare ya AI screen dekhe, toh use asli data kabhi nahi dikhta!
3. **Zero Data Leakage (100% Safe)**:  
   Koi bhi sensitive data kisi bhi company ke server par nahi bheja jata. Asli data sirf aapke browser ki safe tijori (**Local Sandbox Vault**) me rehta hai.
4. **Bilingual AI Assistant (Hindi + English)**:  
   Aap AI se bolkar (Voice) ya type karke Hindi ya English me baat kar sakte hain, page ka summary le sakte hain, ya notes save kar sakte hain!

---

## 📑 Table of Contents (Index)

1. [Quick Start — 2 Minute Setup Guide (Shuru Kaise Karein)](#-quick-start--2-minute-setup-guide)
2. [Chrome Extension Kaise Install Karein (Step-by-Step)](#-chrome-extension-kaise-install-karein)
3. [Extension ke Features aur Unka Use](#-extension-ke-features-aur-unka-use)
   - [Tab 1: Live Shield & Screen Scanner](#1-live-shield--screen-scanner)
   - [Tab 2: Local Browser Vault](#2-local-browser-vault-surakshit-tijori)
   - [Tab 3: Security & Audit Log](#3-security--audit-log)
   - [Tab 4: AI Directives & Voice Chat (Hindi + English)](#4-ai-directives--voice-chat-hindi--english)
   - [Tab 5: Settings, API Key & Assistant Name](#5-settings-api-key--assistant-name)
4. [Free Google Gemini API Key Kaise Banayein (1-Minute)](#-free-google-gemini-api-key-kaise-banayein)
5. [Backend Ko Cloud Par Kaise Deploy Karein (Render / Docker / VPS)](#-cloud-deployment-guide)
6. [Folder Structure (Files ki jaankari)](#-folder-structure)
7. [Troubleshooting & FAQs (Agar koi dikkat aaye)](#-troubleshooting--faqs)

---

## 🚀 Quick Start — 2 Minute Setup Guide

Kisi bhi technical coding ki zaroorat nahi hai. Bas yeh 2 aasan steps follow karein:

### Step 1: Backend Server Chalu Karein (1-Click)

1. Is folder me **`Run_Backend.bat`** file par double click karein.
2. Ek black window (command prompt) khulegi aur likha aayega:
   ```text
   ========================================================
     SecureVision AI - Production Deployable Backend
   ========================================================
   Starting server on http://127.0.0.1:8000 ...
   Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
   ```
3. Bas! Aapka backend chal gaya. Is window ko band mat karein, minimize kar dein.

> 📷 **Screenshot Placeholder 1 (Backend Terminal):**  
> `![Backend Server Terminal Running](screenshots/6-backend-terminal.png)`  
> *(Yahan `Run_Backend.bat` chalne ke baad ki terminal window ka screenshot dalein)*

---

### Step 2: Chrome Extension Kaise Install Karein

1. Apna **Google Chrome** browser kholein.
2. Chrome ke URL bar me type karein:
   ```text
   chrome://extensions
   ```
   aur **Enter** dabayein.
3. Top-Right corner me **"Developer mode"** ka switch hoga, use **ON** kar dein.
4. Top-Left corner me **"Load unpacked"** button par click karein.
5. Apne project ke andar se **`extension`** folder select karein aur **"Select Folder"** dabayein.
6. Chrome me **"SecureVision AI — Privacy Shield & Agent"** card dikh jayega!
7. Chrome ke top bar me jigsaw puzzle 🧩 icon par click karke SecureVision AI ko **Pin 📌** kar lein taaki wo hamesha samne rahe.

> 📷 **Screenshot Placeholder 2 (Chrome Extensions Page):**  
> `![Loading Extension in Chrome](screenshots/chrome-extensions-install.png)`  
> *(Yahan `chrome://extensions` me "Load unpacked" karke extension dikhne ka screenshot dalein)*

---

## 🎯 Extension ke Features aur Unka Use

Extension icon par click karte hi aapke samne **SecureVision AI ka Modern Cyber HUD Window** khulega. Isme 5 aasan tabs hain:

---

### 1. Live Shield & Screen Scanner

Yeh aapka main privacy defense center hai!

> 📷 **Screenshot Placeholder 3 (Live Shield HUD):**  
> `![Live Shield Tab View](screenshots/1-dashboard-live-shield.png)`  
> *(Yahan Live Shield tab ka screenshot dalein jisme toggle aur 6 cards dikhein)*

#### Main Buttons & Controls:
1. **Master Privacy Shield Toggle (Switch)**:
   - Is toggle ko **ON** karte hi screen protection chalu ho jata hai aur badge `ZERO LEAK ACTIVE ✓` green ho jata hai.
   - Screen par toast message aata hai: `🛡️ Screen Shield ACTIVE`.
2. **Scan & Shield Screen Button**:
   - Is button par click karte hi extension active webpage ko turant scan karega.
   - Agar Master Shield OFF tha, toh yeh use automatic ON karke sensitive data par parda laga dega!
3. **Screen Mask Technique (Parda Lagane ke 4 Tarike)**:
   - ⬛ **Blackout**: 100% Solid Black border parda jise AI ka camera ya OCR bilkul nahi padh sakta.
   - 💧 **Deep Blur**: Smooth dhundhla parda jisse website dekhne me sundar lagti hai aur data chhip jata hai.
   - 🟪 **Pixelate**: Retro mosaic style tiles jisse text gayab ho jata hai.
   - 🏷️ **Semantic**: Asli data ki jagah fake token badges (e.g. `[PROTECTED_CARD]`, `[PROTECTED_EMAIL]`) dikhata hai.
4. **Detected Sensitive Items (6 Live Cards)**:
   - 💳 **Cards & CVV**: Bank credit/debit card numbers.
   - 🔑 **Passwords & Keys**: Login passwords, API secret keys.
   - ✉️ **Emails**: Personal/Work email addresses.
   - 📞 **Phone Numbers**: Mobile aur WhatsApp numbers.
   - 🪪 **SSN / Aadhaar / ID**: Government ID cards aur national identifiers.
   - 👤 **Detected Faces**: Webpage par maujood user profile photos aur human faces.
5. **Save to Vault Button**:
   - Webpage par mile sensitive items ko bina internet par bheje aapke browser ke safe sandbox me save kar deta hai.

> 📷 **Screenshot Placeholder 4 (Screen Par Blur / Blackout Masking):**  
> `![Website Par Masking Live](screenshots/2-screen-masking-live.png)`  
> *(Yahan kisi website par cards/phones par Blackout ya Blur laga hone ka screenshot dalein)*

---

### 2. Local Browser Vault (Surakshit Tijori)

Aapka sara sensitive data kisi cloud server par nahi jata, balki aapke apne browser ki safe storage (**IndexedDB & chrome.storage.local**) me rehta hai.

> 📷 **Screenshot Placeholder 5 (Local Vault View):**  
> `![Local Browser Storage Vault](screenshots/3-local-vault.png)`  
> *(Yahan Local Vault tab ka screenshot dalein jisme saved masked records ki list ho)*

- **Zero Cloud Leak**: Data aapke computer se bahar nahi jata.
- **Search & Filter**: Category (Cards, Passwords, Emails, Phones) ya website name se records search karein.
- **Export JSON**: 1-click me apne secured data ka backup JSON file ke roop me download karein.
- **Clear Vault**: Jab chahein ek click me sara local data permanently delete kar dein.

---

### 3. Security & Audit Log

Yahan har privacy event ki live recording hoti hai:
- Kab shield ON ya PAUSE hua.
- Kab scan chala aur kitne sensitive items bachaye gaye.
- Kounsi masking technique select ki gayi.
- Kahi se koi data leak toh nahi ho raha.

---

### 4. AI Directives & Voice Chat (Hindi + English)

Aap SecureVision AI se bolkar (Voice) ya text type karke baat kar sakte hain!

> 📷 **Screenshot Placeholder 6 (AI Directives Console):**  
> `![AI Directives Console](screenshots/4-ai-directives-console.png)`  
> *(Yahan AI Directives tab ka screenshot dalein jisme chat aur quick chips dikhein)*

#### Voice & Conversational Features:
- 🌐 **Language Selector**: Header me `Hindi (Indian) हिन्दी` ya `English (Indian/US)` select karein.
- 🎤 **Voice Mic Button**: Microphone button dabayein aur Hindi ya English me bolein:
  - *"Active page ko summarize kar do"*
  - *"System status kya hai?"*
  - *"Mere notes dikhao"*
  - *"Screen par koi privacy leak toh nahi hai?"*
- 🔊 **Realistic Male AI Voice**: AI Microsoft EdgeTTS ki premium natural Indian Male voice (**hi-IN-MadhurNeural**) me aapse baat karega!
- ⚡ **Quick Directive Chips**: 1-click shortcuts: `📊 Status`, `📝 Notes`, `📑 Page Summary`, `🛡️ Shield Audit`.
- ⛶ **Fullscreen / Expand [F11]**: Top-right corner me fullscreen button dabane par extension full tab me khul jata hai jahan bina band hue continuous hands-free voice chat kar sakte hain!

---

### 5. Settings, API Key & Assistant Name

Yeh tab aapko poori azaadi deta hai apna AI Assistant khud customize karne ki!

> 📷 **Screenshot Placeholder 7 (Settings Tab):**  
> `![Settings Tab View](screenshots/5-settings-api-key.png)`  
> *(Yahan Settings tab ka screenshot dalein jisme Gemini Key aur Assistant Name input ho)*

1. **🔑 Google Gemini API Key Input**:
   - Apni free Google Gemini API key paste karein aur **"Save & Test Key"** dabayein.
   - Extension backend ke through live Google servers se key verify karega:
     - Agar key sahi hai: `✓ Gemini API Key successfully verified and connected!`
     - Agar key galat ya expired hai: Turant clear notice aayega taaki aap nayi key daal sakein.
2. **🏷️ AI Assistant Name**:
   - Aap AI ka name badal kar kuch bhi rakh sakte hain: `SecureVision AI`, `JARVIS`, `Friday`, `Nova`, `Chanakya` etc.
   - **"Save Name"** dabayein. AI usi identity ke sath baat karega!
3. **🌐 Backend Server URL**:
   - Local testing ke liye default: `http://127.0.0.1:8000`
   - Agar aapne backend cloud (Render, Railway, Cloud Run) par deploy kiya hai, toh apna live URL paste karke **"Connect Server"** dabayein!

---

## 🔑 Free Google Gemini API Key Kaise Banayein

Google sabhi users ko Gemini API bilkul **FREE** deta hai bina kisi credit card ke!

1. Apne browser me **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)** kholein.
2. Apne Google account (Gmail) se Login karein.
3. Blue button **"Create API key"** par click karein.
4. "Create API key in new project" select karein.
5. Jo key generate hogi (jo `AIzaSy...` se start hoti hai), use **Copy** kar lein.
6. Extension popup me **⚙️ Settings** tab me jayein, paste karein aur **"Save & Test Key"** par click karein.
7. Bas! Aapka AI Assistant active ho gaya!

> 📷 **Screenshot Placeholder 8 (Google AI Studio):**  
> `![Google AI Studio API Key Creation](screenshots/gemini-api-key-setup.png)`  
> *(Yahan Google AI Studio se API Key generate karne ka screenshot dalein)*

---

## 🌐 Cloud Deployment Guide

Aap chahein toh backend ko cloud par 24/7 host kar sakte hain taaki aapka extension bina local Python chalu kiye bhi kisi bhi computer se connect ho sake!

### Option 1: Render.com par Free Deploy Karein
1. Apne code ko GitHub par upload karein.
2. [Render.com](https://render.com) par free account banayein -> **New Web Service** select karein.
3. Apna GitHub repository connect karein.
4. Settings me:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python run.py`
5. Deploy click karein! Render aapko ek free URL dega jaise:
   ```text
   https://securevision-ai-backend.onrender.com
   ```
6. Is URL ko extension popup ke **⚙️ Settings -> Backend Server URL** me dalein aur **"Connect Server"** dabayein!

### Option 2: Docker Container (Cloud Run / AWS / VPS)
```bash
cd backend
docker build -t securevision-backend .
docker run -p 8000:8000 -e PORT=8000 securevision-backend
```

### Option 3: Localhost par Run
Simply double click karein:
```cmd
Run_Backend.bat
```

---

## 📂 Folder Structure (Files ki Jaankari)

```text
SecoreVision-AI/
├── backend/                      # Python FastAPI Cloud & Local Backend
│   ├── app/
│   │   ├── main.py               # Main Server file (CORS & Routes)
│   │   ├── config.py             # Dynamic Settings (API Key, Assistant Name)
│   │   ├── routers/              # API Endpoints
│   │   │   ├── ai.py             # Chat, Voice TTS, Page Summary, Analysis
│   │   │   ├── config.py         # Key saving, Name saving, Testing
│   │   │   ├── memory.py         # User Notes & Long-term memory
│   │   │   └── system.py         # Health & System Telemetry
│   │   └── services/
│   │       ├── gemini_service.py # Google Gemini API caller & key validator
│   │       ├── memory_service.py # Local JSON memory engine
│   │       └── metrics_service.py# CPU, RAM, Network monitor
│   ├── Dockerfile                # Cloud Docker Container recipe
│   ├── requirements.txt          # Python packages list
│   └── run.py                    # Uvicorn production server launcher
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── assets/                   # Extension icons & stylesheet
│   ├── privacy/                  # In-browser Privacy & PII Scanner
│   │   ├── pii-detector.js       # Cards, CVV, Passwords, Emails, Phones, SSN detector
│   │   ├── face-detector.js      # On-device face detection
│   │   └── redactor.js           # Canvas masking engine
│   ├── storage/
│   │   └── indexeddb-vault.js    # Browser-side zero-leak vault
│   ├── vision/
│   │   └── vision-model.js       # Local WebGPU/WASM vision helpers
│   ├── manifest.json             # Chrome Manifest specification
│   ├── popup.html                # Main Extension HUD Window
│   ├── popup.css                 # Cyber-Shield Dark Theme UI
│   ├── popup.js                  # Extension Controller (Multi-tab, Key test)
│   ├── content.js                # In-page real-time DOM shield & masking
│   └── background.js             # Service worker & Cloud router
├── screenshots/                  # Folder jahan aap apne screenshots save kar sakte hain
├── Run_Backend.bat               # 1-Click Windows Launcher
└── README.md                     # Aap yeh documentation padh rahe hain
```

---

## ❓ Troubleshooting & FAQs (Agar Koi Dikkat Aaye)

### Q1: Extension popup khola par "Shield" kaam nahi kar raha?
- **Karan**: Chrome ki security rule ke anusar browser ke internal pages (jaise `chrome://extensions`, `chrome://settings`, ya new empty tab) par koi bhi extension inject hone se Chrome rok deta hai.
- **Solution**: Kisi bhi normal website (jaise [google.com](https://www.google.com), [amazon.in](https://www.amazon.in), ya kisi login page) par jayein aur wahan extension ka **"Scan & Shield Screen"** button dabayein. Yeh turant mask kar dega!

### Q2: Maine extension abhi load kiya, purane tabs par shield nahi aa raha?
- **Solution**: Jab aap pehli baar extension install karte hain, tab jo webpage pehle se khula hua tha use ek baar refresh (F5 ya Reload) kar lein. Uske baad naye khulne wale sabhi tabs automatic protect ho jayenge!

### Q3: Gemini API Key lagane par "Invalid Key" ya "Wrong Format" bol raha hai?
- **Solution**: Google Gemini API key hamesha `AIzaSy...` se start hoti hai.
  - Make sure karein aapne poori key copy ki hai (kam se kam 39 characters).
  - Kisi dusri company (jaise OpenAI `sk-...`) ki key na dalein.
  - [Google AI Studio](https://aistudio.google.com/app/apikey) se free key generate karein.

### Q4: Voice microphone prompt nahi dikh raha ya popup band ho jata hai?
- **Solution**: Chrome me extension popup se click karne par agar popup band ho raha hai, toh popup ke top-right me maujood **⛶ (Fullscreen / Full Tab)** button dabayein (ya F11). Isse extension full tab me khul jayega aur microphone permission hamesha ke liye allow ho jayegi!

### Q5: Kya mera sensitive data internet par ja raha hai?
- **Bilkul Nahi!** SecureVision AI ka core architecture hi **Zero-Leak Client Privacy** par bana hai:
  - Detection aur Masking aapke computer ke andar hoti hai.
  - Screen par parda lagne ke baad hi sanitised tokens generate hote hain.
  - Asli passwords aur cards hamesha encrypted local browser vault me hi rehte hain.

---

## 🔒 Security & Privacy Manifesto

> *"Aapki privacy aapka adhikaar hai. Kisi bhi AI ko aapka private screen data dekhne ki anumati nahi honi chahiye."*

SecureVision AI ensure karta hai ki aap bina kisi chinta ke AI assistants aur agents ka labh utha sakein, poori suraksha aur shanti ke sath.

---

*Made with ❤️ for Privacy, Security & Autonomous AI.*
