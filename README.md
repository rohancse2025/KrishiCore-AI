# krishiCore AI 🌾🤖
> **An AI-Powered, IoT-Integrated, Offline-First Smart Agriculture Ecosystem**

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?style=for-the-badge&logo=react)](./frontend)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](./backend)
[![Python](https://img.shields.io/badge/ML%20Engine-Python%20Scikit--Learn-3776AB?style=for-the-badge&logo=python)](./ai_models)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32%20Arduino-E7352C?style=for-the-badge&logo=espressif)](./iot)
[![PWA](https://img.shields.io/badge/Features-Offline%20PWA-5A0FC8?style=for-the-badge&logo=pwa)](./frontend)

---

## 🌟 Introduction
**krishiCore AI** is a comprehensive smart agriculture monorepo designed to assist farmers with data-driven decision making. By bridging the gap between local physical telemetry and cloud-based intelligence, the platform allows farmers to monitor soil parameters in real-time, get precision crop recommendation predictions, and interact with an AI voice assistant in their local language. 

To overcome internet instability in rural fields, **krishiCore AI** features an **offline-first PWA architecture** that keeps the application running seamlessly without a network connection.

---

## 📦 Directory Structure
The repository is structured logically to separate concerns:

```bash
krishicore-ai/
├── backend/               # 🐍 FastAPI Backend Server
│   ├── app/               # Main application routing and core logic
│   │   ├── api/           # Router and endpoint handlers (weather, iot, crops, sms)
│   │   ├── core/          # App configurations and constants
│   │   ├── database.py    # SQLite / SQLAlchemy Models & DB Session handlers
│   │   └── main.py        # Entry point for FastAPI startup
│   ├── .env.example       # Template env configuration
│   ├── model.pkl          # Trained Random Forest ML model
│   └── requirements.txt   # Python server requirements
│
├── frontend/              # ⚛️ React (Vite) PWA Client
│   ├── public/            # Static assets (PWAs, manifest, service workers)
│   ├── src/               # React components, state, hooks, pages, translations
│   │   ├── ui/            # App screens (Chat, Weather, Market, Scan, IoT Dashboard)
│   │   ├── data/          # Crop rules & fallback databases
│   │   ├── hooks/         # Audio recording, translation, and status custom hooks
│   │   └── lib/           # Offline chat systems and offline ML estimators
│   └── package.json       # Node package manager configurations
│
├── iot/                   # 🔌 IoT Hardware & Firmware Code
│   └── firmware/          # Custom ESP32 C++ firmware
│
└── docs/                  # 📄 Project Reports & Presentation Materials
    ├── assets/            # Project checklist and manual files
    ├── report/            # Comprehensive project details
    ├── presentation/      # Slide-by-slide guide
    └── videos/            # Demo video scripts and hosting instructions
```

---

## 🚀 Key Highlights & Capabilities

### 1. 🧠 ML-Driven Crop Recommendation
* Uses an integrated **Random Forest classifier** (`model.pkl`) to analyze Nitrogen (N), Phosphorus (P), Potassium (K), Soil pH, Temperature, Humidity, and Rainfall.
* Provides high-confidence crop recommendation predictions to maximize crop yield.

### 2. 📴 PWA & Offline Resilience
* Service Workers cache asset files (`sw.js`) to allow rendering without a network connection.
* Fallback modules execute local rule-based crop recommendations and local weather safety tips when offline.
* IndexedDB acts as a localized data-buffer for sensor readings when cellular data drops out.

### 3. 🎙️ Multilingual GenAI Assistant
* Powered by the **Groq Cloud API** running low-latency Large Language Models (LLMs).
* Integrated with Web Speech API for voice recognition input and Text-to-Speech (TTS) audio playback.
* Localized dynamically with translations supporting **English, Hindi, Kannada, Telugu, Tamil, and Marathi**.

### 4. 🔌 IoT Field Telemetry & Messaging Pipelines
* ESP32 firmware reads physical soil metrics and pushes raw telemetry data to `/api/v1/iot/reading`.
* Automatically triggers SMS (via **Fast2SMS**) or WhatsApp warning messages (via **Twilio**) if soil moisture levels drop below 30%.

---

## 🛠️ Step-by-Step Installation & Run Guide

### 1. Backend Server Setup
Ensure you have Python 3.9+ installed.

```bash
# 1. Navigate to backend folder
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate      # For Windows Command Prompt/PowerShell
source .venv/bin/activate    # For macOS/Linux

# 3. Install required packages
pip install -r requirements.txt

# 4. Copy environment example and fill in API keys
cp .env.example .env
```

To run the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Open:
* Health Check: [http://localhost:8000/health](http://localhost:8000/health)
* OpenAPI Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend React Web App Setup
Ensure you have Node.js 18+ installed.

```bash
# 1. Navigate to frontend folder
cd frontend

# 2. Install node dependencies
npm install

# 3. Start development server
npm run dev
```
Open: [http://localhost:5173](http://localhost:5173) in your browser.

---

### 3. IoT ESP32 Firmware Installation
1. Install [Arduino IDE](https://www.arduino.cc/en/software).
2. Install the **ESP32 board manager** in Arduino IDE.
3. Open the file [KisanCore_ESP32.ino](./iot/firmware/KisanCore_ESP32/KisanCore_ESP32.ino).
4. Update the Wi-Fi Credentials (`ssid`, `password`) and backend endpoint destination URL.
5. Connect your ESP32 board and click **Upload**.

---

## 📄 Project Materials & Submission files

All project materials requested for evaluation, presentations, and reports can be found in the [docs/](./docs) directory:

1. **Project Report**: A detailed scientific documentation is available at [docs/report/README.md](./docs/report/README.md).
2. **Presentation Deck (PPT)**: A slide-by-slide guide for creating slides is available at [docs/presentation/README.md](./docs/presentation/README.md).
3. **Demo Video Script**: Storyboards and guidelines for recording demonstration clips are available at [docs/videos/README.md](./docs/videos/README.md).
4. **Evaluation Checklist**: The final demo requirements checklist can be accessed directly at [docs/assets/krishicore-demo-checklist.pdf](./docs/assets/krishicore-demo-checklist.pdf).