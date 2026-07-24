# krishiCore AI - Smart Agriculture System

This is our final year college project. It is a system built to help farmers monitor soil parameters and get crop recommendations based on soil metrics and weather. It has three main parts:

1. **Frontend**: A React website built using Vite. It shows real-time soil data from sensors and lets the farmer get crop recommendations. It also has a voice assistant chatbot that supports different Indian languages (Hindi, Kannada, Telugu, etc.).
2. **Backend**: A FastAPI server in Python. It handles crop recommendations using a trained machine learning model (`model.pkl`) and saves farmer details in a SQLite database.
3. **IoT (ESP32)**: An ESP32 microcontroller with sensors placed in the soil. It reads soil moisture, temperature, and NPK levels, and sends them to the backend server. It also triggers SMS/WhatsApp alerts if the soil gets too dry.

---

## Project Folder Structure

* `frontend/` - React app with Vite and Tailwind. Contains UI screens for chat, weather, market prices, and profile.
* `backend/` - FastAPI server files. Contains our ML model (`model.pkl`) and API routes.
* `iot/` - Code for the ESP32 microcontroller.
* `docs/` - Our project submission reports, PPT slides layout.

---

## How to Setup and Run

### 1. Backend Server Setup
Go to the backend directory and activate python environment:
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Create .env file by copying example
copy .env.example .env
```
Now fill in your API keys in the `.env` file (like Groq, OpenWeatherMap, Twilio).

Run the backend server:
```bash
uvicorn app.main:app --reload
```
API docs will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup
Go to frontend folder and install node packages:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. IoT Board Setup
Open the ESP32 code located in `iot/firmware/KisanCore_ESP32/KisanCore_ESP32.ino` using the Arduino IDE. Put your Wi-Fi name and password inside the code, then upload it to your ESP32 board.

---

## Project Submission Materials
Our project report, presentation slides guidelines, and video demo guide are all organized inside the `docs/` folder:
* **Project Report**: [docs/report/README.md](./docs/report/README.md)
* **Presentation Slides Layout**: [docs/presentation/README.md](./docs/presentation/README.md)
* **Demo Video Script**: [docs/videos/README.md](./docs/videos/README.md)
* **Demo Checklist**: [docs/assets/krishicore-demo-checklist.pdf](./docs/assets/krishicore-demo-checklist.pdf)
