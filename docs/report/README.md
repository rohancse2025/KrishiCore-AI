# krishiCore AI - Final Project Report
**Ecosystem for Smart Farming using AI, ML & IoT**

---

## 1. Introduction
This project was built to address the lack of data-driven decision making in Indian agriculture. Often, farmers decide what crops to plant based on traditional habits rather than the actual chemical properties of their soil. This can lead to low crop yields or soil exhaustion.

**krishiCore AI** is a smart farming solution that helps farmers by:
- Gathering soil metrics using IoT sensors (ESP32).
- Using a Machine Learning model to suggest the best crop to grow.
- Providing a voice-enabled chatbot that talks to farmers in regional languages to answer farming questions.

---

## 2. Technologies Used

- **Frontend**: React.js with TypeScript and Tailwind CSS. We used Vite to build the project. It has page views for checking weather, viewing live sensor graphs, searching mandi prices, and chatting with the AI.
- **Backend**: FastAPI (Python) server. It connects to a SQLite database using SQLAlchemy and runs predictions using our trained ML model.
- **Machine Learning**: A Random Forest model trained on soil datasets and saved as `model.pkl`. It uses `joblib` for loading and predicting.
- **IoT (Hardware)**: ESP32 microchip programmed in C++ using Arduino IDE. It connects to soil sensors to measure NPK, moisture, and temperature.
- **API Services**:
  - **Groq API**: For the AI chatbot answers.
  - **OpenWeather API**: For fetching live weather forecasts.
  - **Fast2SMS / Twilio**: For sending emergency SMS and WhatsApp notifications.

---

## 3. How the System Works

1. **Sensor Ingestion**: The ESP32 is deployed in the field. It takes sensor readings (e.g., moisture) and sends them to the backend server's `/api/v1/iot/reading` endpoint.
2. **Alert Trigger**: If soil moisture drops below 30%, the backend automatically triggers an SMS or WhatsApp alert to notify the farmer that they need to water their crops.
3. **Crop Prediction**: The farmer inputs Nitrogen, Phosphorus, Potassium, soil pH, and weather values in the UI. The backend uses the ML model (`model.pkl`) to run a prediction and recommends the best crop.
4. **AI Assistant**: The farmer clicks the speak button to ask farming questions. The app records the voice, translates it, queries the LLM via Groq, and plays the answer back in the selected language.

---

## 4. SQLite Database Design
We use SQLite database to store user details and historical records. The database schemas are configured in `backend/app/database.py`:

* **Farmers Table**: Stores farmer's name, phone, hashed password, location, farm size, and soil parameters.
* **Crop Records Table**: Stores information about crops currently planted, planted date, expected harvest date, status (e.g., growing, harvested), and custom notes.

---

## 5. Future Scope
1. **Pest and Leaf Disease Detection**: Adding computer vision models to identify crop diseases by uploading leaf photos.
2. **Mandi Price Forecasts**: Using time-series prediction to forecast grain prices.
3. **Solar Powered Valve**: Connecting the ESP32 to a physical relay and valve to automatically start irrigation when the soil is dry.
