# krishiCore AI - Project Demo Video Guide
**Guidelines & Script for Recording the Project Video**

This guide will help you record a 5-minute video demonstration of **krishiCore AI** for your project submission.

---

## 📹 Video Links
* **YouTube/Drive Link**: [Paste your demo video link here]
* **Demo Checklist**: [docs/assets/krishicore-demo-checklist.pdf](../assets/krishicore-demo-checklist.pdf)

---

## 🎬 Suggested Video Script & Flow (5 Minutes)

### 1. Introduction (0:00 - 0:45)
* **What to show**: Open the React homepage and introduce yourself.
* **Script**:
  > "Hello everyone, my name is [Name] and today I am demonstrating our project **krishiCore AI**. It is an integrated smart farming system that combines IoT soil sensors, Machine Learning crop recommendation, and an AI chat assistant."

### 2. Crop Recommendation Demo (0:45 - 2:00)
* **What to show**: Go to the Crops page, enter some NPK, pH, and weather values, and click Predict.
* **Script**:
  > "Here is our Crop Recommendation page. The farmer can input Nitrogen, Phosphorus, Potassium, temperature, and soil pH. When they click Predict, our backend loads the trained Random Forest model (`model.pkl`) and recommends the best crop that will grow in these conditions."

### 3. AI Chat Assistant Demo (2:00 - 3:15)
* **What to show**: Go to the Chat page. Click the flag to change languages (e.g. to Hindi or Kannada). Click the microphone button, ask a question (like "Which fertilizer is good for tomato?"), and play the voice answer back.
* **Script**:
  > "We also built an AI assistant. Farmers can select their local language and click the Speak button. It converts their speech to text, gets the answer from Groq LLM API, and speaks the response back to them. This helps farmers who cannot read or write."

### 4. IoT Soil Telemetry Demo (3:15 - 4:15)
* **What to show**: Go to the IoT page. Show the live graphs updating.
* **Script**:
  > "Here is the IoT dashboard. The soil moisture and temperature readings sent by the ESP32 microcontroller are displayed in real-time. If the ESP32 sends a moisture level below 30%, our system immediately alerts the farmer."

### 5. SMS & WhatsApp Alerts Demo (4:15 - 4:45)
* **What to show**: Show the phone screen where the Fast2SMS SMS alert or Twilio WhatsApp alert arrives when the soil is dry.
* **Script**:
  > "As you can see on the phone screen, when the sensor detects dry soil, the backend automatically triggers an SMS and WhatsApp message to the farmer's phone, telling them to check the irrigation."

### 6. Conclusion (4:45 - 5:00)
* **Script**:
  > "That is the summary of krishiCore AI. Thank you very much!"
