from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import time
import os
import json

router = APIRouter()

# --- IST CONFIGURATION ---
IST = timezone(timedelta(hours=5, minutes=30))

# --- MODELS ---
class IOTData(BaseModel):
    temperature: float
    humidity: float
    soil_moisture: float

class OverrideRequest(BaseModel):
    command: str  # "ON", "OFF"
    duration_minutes: Optional[int] = 60
    duration_seconds: Optional[int] = 0

# --- IN-MEMORY STORAGE & PERSISTENCE ---
DATA_FILE = "latest_reading.json"

latest_reading = {
    "temperature": 0.0,
    "humidity": 0.0,
    "soil_moisture": 0.0,
    "irrigation_needed": False,
    "suggestion": "No data",
    "timestamp": "Never",
    "unix_timestamp": 0,
    "manual_override": "OFF", # Default to Manual OFF for safety
    "override_expiry_time": int(time.time() + 86400), 
    "farmer_phones": [], # List of whatsapp: numbers
    "last_alert_time": 0
}

def save_persistence():
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(latest_reading, f)
    except Exception as e:
        print(f"Error saving persistence: {e}")

def load_persistence():
    global latest_reading
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r") as f:
                saved_data = json.load(f)
                latest_reading.update(saved_data)
                print("Persistence loaded successfully.")
    except Exception as e:
        print(f"Error loading persistence: {e}")

load_persistence()

def broadcast_whatsapp(message: str):
    """Send a message to all registered farmers and the environment fallback phone."""
    from app.utils.sms_utils import send_whatsapp_message
    
    targets = set(latest_reading.get("farmer_phones", []))
    env_phone = os.getenv("FARMER_PHONE")
    if env_phone:
        if not env_phone.startswith("whatsapp:"):
            clean = "".join(filter(str.isdigit, env_phone))
            if len(clean) == 10: clean = "91" + clean
            env_phone = f"whatsapp:+{clean}"
        targets.add(env_phone)
    
    for phone in targets:
        if phone:
            send_whatsapp_message(phone, message)

def calculate_irrigation_status(moisture: float):
    """Centralized logic to decide if the pump should be ON or OFF."""
    irrigation_needed = False
    message = "Soil moisture is optimal."
    
    # 0. Check if we have any data at all
    if latest_reading.get("unix_timestamp", 0) == 0:
        return False, "Waiting for sensor data..."

    # 0b. If moisture reads exactly 0.0, treat as sensor disconnected
    if moisture == 0.0:
        return False, "Soil sensor disconnected or no data."

    # 1. Manual Override takes precedence
    if latest_reading["manual_override"] == "ON":
        irrigation_needed = True
        message = "Manual Override: Pump is ON."
    elif latest_reading["manual_override"] == "OFF":
        irrigation_needed = False
        message = "Manual Override: Pump is OFF."
    else:
        # 2. Standard Autonomous logic
        if moisture < 30:
            irrigation_needed = True
            message = f"Moisture is low ({moisture}%). Turning pump ON."
        elif moisture > 60:
            irrigation_needed = False
            message = f"Moisture is high ({moisture}%). Turning pump OFF."
        else:
            irrigation_needed = latest_reading.get("irrigation_needed", False)
            message = f"Moisture is stable ({moisture}%)."
            
    return irrigation_needed, message

# --- ROUTES ---

@router.get("/test")
def test_iot():
    return {"status": "iot_router_active"}

@router.post("/data")
@router.post("/")
async def post_iot_data(data: IOTData):
    global latest_reading
    # Ensure we have the latest state from other workers/sessions
    load_persistence()
    
    print(f"IOT DEBUG: Received data -> Temp: {data.temperature}, Hum: {data.humidity}, Soil: {data.soil_moisture}")
    
    # 1. Check for timer expiry
    if latest_reading["manual_override"] is not None:
        if time.time() > latest_reading["override_expiry_time"]:
            print("⏰ TIMER EXPIRED: Forcing pump to OFF mode.")
            latest_reading["manual_override"] = "OFF"
            save_persistence()

    # 2. Update values
    now = datetime.now(IST)
    latest_reading.update({
        "temperature": data.temperature,
        "humidity": data.humidity,
        "soil_moisture": data.soil_moisture,
        "timestamp": now.strftime("%I:%M %p"),
        "unix_timestamp": int(time.time() * 1000)
    })
    
    # 3. Calculate status
    irrigation_needed, message = calculate_irrigation_status(data.soil_moisture)
    latest_reading["irrigation_needed"] = irrigation_needed
    latest_reading["suggestion"] = message
    save_persistence()
    
    # 4. Alerts (3-min cooldown)
    # Skip alert entirely if soil sensor reads 0.0 (sensor disconnected)
    time_since_last = time.time() - latest_reading["last_alert_time"]
    alert_cooldown_ok = time_since_last > 180 
    
    if data.soil_moisture > 0.0 and data.soil_moisture < 30:
        if not alert_cooldown_ok:
            print(f"⏳ Alert cooldown active: {int(180 - time_since_last)}s remaining.")
        else:
            print(f"🚨 DRY ALERT TRIGGERED! Moisture: {data.soil_moisture}%")
            latest_reading["last_alert_time"] = time.time()
            alert_msg = (
                f"KrishiCore SMART ALERT:\n"
                f"Soil moisture is TOO DRY ({data.soil_moisture}%).\n"
                f"Your crops may need water. Should I turn on the pump?\n"
                f"Reply 'PUMP ON 30' to water for 30 mins."
            )
            broadcast_whatsapp(alert_msg)
            save_persistence()

    return {
        "status": "ok", 
        "relay_command": "ON" if irrigation_needed else "OFF",
        "irrigation_needed": irrigation_needed,
        "suggestion": message
    }

@router.post("/override")
async def set_override(req: OverrideRequest):
    global latest_reading
    if req.command not in ["ON", "OFF"]:
        return {"status": "error", "message": "Invalid command"}
    
    latest_reading["manual_override"] = req.command
    if req.command == "ON":
        total_seconds = (req.duration_minutes * 60) + req.duration_seconds
        latest_reading["override_expiry_time"] = time.time() + total_seconds
    else:
        latest_reading["override_expiry_time"] = time.time() + 86400 
    
    # Immediately recalculate status for instant UI update
    irr_needed, msg = calculate_irrigation_status(latest_reading["soil_moisture"])
    latest_reading["irrigation_needed"] = irr_needed
    latest_reading["suggestion"] = msg
    
    save_persistence()
    return {"status": "ok", "message": f"Pump overridden to {req.command}"}

@router.delete("/override")
async def clear_override():
    global latest_reading
    latest_reading["manual_override"] = None
    latest_reading["override_expiry_time"] = 0
    # Recalculate for instant UI update
    irr_needed, msg = calculate_irrigation_status(latest_reading["soil_moisture"])
    latest_reading["irrigation_needed"] = irr_needed
    latest_reading["suggestion"] = msg
    save_persistence()
    return {"status": "ok", "message": "Override cleared. Switched to Auto Mode."}

@router.get("/latest")
async def get_latest_data():
    # Ensure we have the latest state from other workers/sessions
    load_persistence()
    
    if latest_reading["manual_override"] is not None:
        if time.time() > latest_reading["override_expiry_time"]:
            print("⏰ TIMER EXPIRED: Forcing pump to OFF mode.")
            latest_reading["manual_override"] = "OFF"
            save_persistence()
    
    # Always recalculate before returning to ensure website is never out of sync
    irr_needed, msg = calculate_irrigation_status(latest_reading["soil_moisture"])
    latest_reading["irrigation_needed"] = irr_needed
    latest_reading["suggestion"] = msg
    
    return latest_reading

@router.get("/test-alert")
async def test_alert():
    msg = "KrishiCore Test: Your WhatsApp Alert System is working! 🚀🌾"
    broadcast_whatsapp(msg)
    return {"status": "test_triggered", "targets": list(set(latest_reading.get("farmer_phones", [])))}

@router.delete("/clear")
async def clear_iot_data():
    global latest_reading
    latest_reading.update({
        "temperature": 0.0,
        "humidity": 0.0,
        "soil_moisture": 0.0,
        "irrigation_needed": False,
        "suggestion": "No data",
        "timestamp": "Never",
        "unix_timestamp": 0,
        "last_alert_time": 0,
        "manual_override": "OFF"
    })
    save_persistence()
    return {"status": "cleared"}
