# Video Demonstration Guide: krishiCore AI 🎥🌾
**Demonstration Script, Recording Guidelines & Video Assets**

This directory is designated for your **krishiCore AI** video demonstration files, script guidelines, and reference links. Use this guide to record an impactful 5-minute video demonstration of the project.

---

## 📹 Project Demo Video Links
> [!TIP]
> Once you record your demonstration video, upload it to YouTube, Google Drive, or Vimeo, and add your links below for easy access by evaluators:
> * **Main Demo Video Link**: [Insert YouTube/Drive Link Here]
> * **Backup Mirror Link**: [Insert Mirror Link Here]

---

## 🎬 Suggested Video Structure & Script (5 Minutes)

Here is a recommended storyboard/timeline for presenting **krishiCore AI** effectively:

### 1. Introduction (0:00 - 0:45)
* **Visual**: Presenter on camera or showing the krishiCore AI dashboard/logo.
* **Audio Script**:
  > "Hello! Today we are demonstrating **krishiCore AI**, an intelligent, offline-first smart agriculture ecosystem designed for remote farming communities. We combine Internet of Things (IoT) sensors, Machine Learning (ML), and Generative AI, resolving critical gaps in connectivity, soil analysis, and language barriers."
* **Goal**: State the problem (connectivity and soil health) and introduce the solution immediately.

### 2. Frontend PWA & Offline Demo (0:45 - 2:00)
* **Visual**: Screen recording of the React web app. Demonstrate clicking through pages, activating dark mode, and changing languages. Show the application operating in offline mode.
* **Action**:
  - Toggle internet connection to **offline**.
  - Show the Offline Banner appearing.
  - Interact with the crop rules and database offline.
  - Show multi-lingual voice queries (e.g., Hindi or Kannada) using the microphone button.
* **Audio Script**:
  > "Many farms have zero internet coverage, so we built krishiCore AI as a Progressive Web App (PWA). By caching assets and using local rule engines, the app remains fully functional offline. The farmer can also speak in their local language, which is translated dynamically using our translation layers."

### 3. ML Crop Recommendation (2:00 - 3:00)
* **Visual**: Enter soil NPK, pH, temperature, and rainfall values in the Crop Recommendation page. Hit 'Predict' and show the recommended crop.
* **Audio Script**:
  > "Our crop recommender utilizes a Random Forest model trained on soil compositions. By inputting Nitrogen, Phosphorus, Potassium, soil pH, and temperature, the ML model predicts the most high-yielding crop, reducing the risk of harvest failure."

### 4. IoT Soil Node & Live Telemetry (3:00 - 4:00)
* **Visual**: Show the ESP32 hardware device (if recorded physically) or show the live IoT dashboard updating as sensors send new values to FastAPI.
* **Action**:
  - Show the live sensor graph on the IoT page.
  - (Optional) Dunk the soil moisture probe in water and show the graph spike in real-time.
* **Audio Script**:
  > "This telemetry is captured by our ESP32 IoT node deployed in the soil. Running our custom C++ firmware, it periodically posts soil conditions to the FastAPI backend, where they are rendered in real-time charts."

### 5. SMS & WhatsApp Alerts (4:00 - 4:40)
* **Visual**: Show a mobile phone screen. Simulate/trigger dry soil conditions (moisture < 30%) and show a live SMS or WhatsApp alert arriving on the phone.
* **Audio Script**:
  > "When soil moisture drops below critical limits, the backend triggers alert handlers, sending automated warnings via Fast2SMS and Twilio WhatsApp to ensure the farmer takes action immediately, even if they aren't looking at the dashboard."

### 6. Conclusion (4:40 - 5:00)
* **Visual**: Presenter on camera or architectural overview.
* **Audio Script**:
  > "By bridging the gap between hardware sensors, cloud intelligence, and offline web apps, krishiCore AI brings precision farming to every field. Thank you!"

---

## 🎙️ Recording Tips
1. **Resolution**: Record in full HD (1080p, 16:9 ratio).
2. **Audio**: Use a clear external microphone if possible. Filter out background noise.
3. **Pacing**: Speak clearly and slowly, especially when highlighting multilingual/translation features.
4. **Interactive Demos**: Always show *live* inputs and actions rather than static screenshots.
