# krishiCore AI - Presentation Slides Outline
**Slide-by-Slide Outline for PPT Slides**

Use this guide to construct your PowerPoint presentation slides for the final project review.

---

### Slide 1: Project Title
* **Slide Heading**: krishiCore AI: Smart Farming Assistant
* **Key points**:
  - final year project presentation.
  - Built by: [Your Name]
  - Technologies: React, FastAPI, ESP32, and Machine Learning.

### Slide 2: Problem Statement
* **Slide Heading**: Challenges in Indian Agriculture
* **Key points**:
  - Farmers plant crops based on traditional habits instead of soil analysis.
  - Lack of real-time monitoring leads to underwatered fields.
  - Expert advice is expensive and rarely available in regional languages.

### Slide 3: Project Objectives
* **Slide Heading**: What we want to achieve
* **Key points**:
  - Provide soil NPK and weather-based crop recommendations.
  - Build an automated SMS alert system for watering crops.
  - Design a multi-lingual AI chatbot that responds to voice queries.

### Slide 4: System Block Diagram
* **Slide Heading**: Project Architecture
* **Key points**:
  - **Sensors (NPK, Moisture)** ➡️ **ESP32 Microcontroller** ➡️ **FastAPI Server (Python)**.
  - Backend saves data in **SQLite Database** and queries **ML model (.pkl)**.
  - **React Dashboard (Vite)** displays sensor graphs and recommendations.
  - **External APIs**: Groq (LLM chatbot), OpenWeather, Fast2SMS.

### Slide 5: Machine Learning Crop Recommendation
* **Slide Heading**: ML Crop Prediction Model
* **Key points**:
  - Random Forest Classifier trained on soil dataset.
  - Inputs: N, P, K, pH, Temperature, Humidity, Rainfall.
  - Saved as `model.pkl` and loaded dynamically by the FastAPI backend.
  - Output: Recommends the highest-yielding crop.

### Slide 6: IoT Sensor Integration
* **Slide Heading**: IoT Hardware Setup
* **Key points**:
  - ESP32 microchip programmed in C++.
  - Collects analog signals from soil sensors.
  - Sends reading payload as JSON to `/api/v1/iot/reading`.
  - Live charts rendered on the React dashboard.

### Slide 7: AI Chat Assistant
* **Slide Heading**: Multilingual Voice Chatbot
* **Key points**:
  - Powered by LLMs via Groq Cloud API.
  - Uses browser Web Speech API for voice recording and text-to-speech.
  - Support for English, Hindi, Marathi, Kannada, Tamil, and Telugu translations.

### Slide 8: Automated Alerts
* **Slide Heading**: Emergency SMS & WhatsApp
* **Key points**:
  - If moisture level drops below threshold (< 30%), warning is triggered.
  - Sends immediate SMS to farmer via Fast2SMS API.
  - Sends WhatsApp message to farmer via Twilio API.
  - Ensures timely irrigation.

### Slide 9: Future Scope
* **Slide Heading**: Next Steps
* **Key points**:
  - Integrate image classification for crop leaf disease detection.
  - Solenoid water valves for automatic motor control.
  - Mandi market pricing index integrations.

### Slide 10: Conclusion
* **Slide Heading**: Thank You!
* **Key points**:
  - Successfully connected hardware sensors, Python backend, and React web interface.
  - Questions?
