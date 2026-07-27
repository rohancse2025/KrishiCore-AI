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

import math
import urllib.request
import urllib.error

POLYGON_CACHE = {}

def get_tile_coords(lat: float, lon: float, zoom: int = 16):
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(lat_rad) + (1.0 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return x, y

def get_simulated_metrics(lat: float, lon: float):
    import hashlib
    coord_str = f"{lat:.4f},{lon:.4f}".encode()
    hash_hex = hashlib.md5(coord_str).hexdigest()
    seed = int(hash_hex[:6], 16)
    
    # Deterministic NDVI between 0.38 and 0.82
    ndvi_val = round(0.38 + (seed % 45) / 100.0, 2)
    # Deterministic moisture between 0.22 and 0.67
    moisture_val = round(0.22 + (seed % 46) / 100.0, 2)
    # Deterministic cloud cover between 0% and 12%
    cl_val = round((seed % 13) * 1.0, 1)
    
    return ndvi_val, moisture_val, cl_val

def get_or_create_polygon(api_key: str, lat: float, lon: float) -> str:
    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in POLYGON_CACHE:
        return POLYGON_CACHE[cache_key]

    try:
        url_list = f"http://api.agromonitoring.com/agro/1.0/polygons?appid={api_key}"
        req = urllib.request.Request(url_list)
        with urllib.request.urlopen(req, timeout=8) as resp:
            polygons = json.loads(resp.read().decode())
            for poly in polygons:
                center = poly.get("center", [])
                if len(center) == 2:
                    p_lon, p_lat = center[0], center[1]
                    if abs(p_lat - lat) < 0.005 and abs(p_lon - lon) < 0.005:
                        poly_id = poly["id"]
                        POLYGON_CACHE[cache_key] = poly_id
                        return poly_id
            
            # If maximum limit is reached, fall back to first existing polygon
            if len(polygons) >= 1:
                poly_id = polygons[0]["id"]
                POLYGON_CACHE[cache_key] = poly_id
                return poly_id
    except Exception as e:
        print(f"Error checking polygons list: {e}")

    # Create new polygon
    offset = 0.001
    coords = [
        [lon - offset, lat - offset],
        [lon + offset, lat - offset],
        [lon + offset, lat + offset],
        [lon - offset, lat + offset],
        [lon - offset, lat - offset]
    ]
    payload = {
        "name": f"Farm_{round(lat, 4)}_{round(lon, 4)}",
        "geo_json": {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords]
            }
        }
    }
    
    try:
        url_create = f"http://api.agromonitoring.com/agro/1.0/polygons?appid={api_key}"
        data_bytes = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url_create, 
            data=data_bytes, 
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            poly_data = json.loads(resp.read().decode())
            poly_id = poly_data["id"]
            POLYGON_CACHE[cache_key] = poly_id
            return poly_id
    except Exception as e:
        print(f"Error creating polygon: {e}")
        return None

@router.get("/satellite")
async def get_satellite_data(lat: float, lon: float):
    # Calculate tile coordinates for Esri fallback mapping
    tile_x, tile_y = get_tile_coords(lat, lon, zoom=18)
    esri_satellite_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/{tile_y}/{tile_x}"
    
    # Calculate deterministic simulated readings unique to this coordinate
    sim_ndvi, sim_moisture, sim_cl = get_simulated_metrics(lat, lon)
    
    api_key = os.environ.get("OPENWEATHER_API_KEY", "").strip()
    if not api_key:
        # Keyless fallback: return Esri satellite map and dynamic simulated NDVI index
        return {
            "is_fallback": True,
            "ndvi_image": esri_satellite_url,
            "truecolor_image": esri_satellite_url,
            "ndvi_index": sim_ndvi,
            "moisture_index": sim_moisture,
            "cloud_cover": sim_cl,
            "satellite_name": "Sentinel-2 L2A (Esri)",
            "pass_date": datetime.now(IST).strftime("%B %d, %Y"),
            "lat": lat,
            "lon": lon
        }

    # Fetch polygon ID
    poly_id = get_or_create_polygon(api_key, lat, lon)
    if not poly_id:
        return {
            "is_fallback": True,
            "ndvi_image": esri_satellite_url,
            "truecolor_image": esri_satellite_url,
            "ndvi_index": sim_ndvi,
            "moisture_index": sim_moisture,
            "cloud_cover": sim_cl,
            "satellite_name": "Sentinel-2 L2A (Esri)",
            "pass_date": datetime.now(IST).strftime("%B %d, %Y"),
            "lat": lat,
            "lon": lon
        }

    # Search for Sentinel-2 images in the last 30 days
    end_time = int(time.time())
    start_time = end_time - (30 * 24 * 3600)
    
    try:
        url_search = f"http://api.agromonitoring.com/agro/1.0/image/search?polyid={poly_id}&start={start_time}&end={end_time}&appid={api_key}"
        req = urllib.request.Request(url_search)
        with urllib.request.urlopen(req, timeout=10) as resp:
            images = json.loads(resp.read().decode())
            if images and len(images) > 0:
                # Filter Sentinel-2 images
                sentinel_images = [img for img in images if "image" in img]
                if sentinel_images:
                    latest = sentinel_images[-1] # take the most recent pass
                    ndvi_img = latest["image"].get("ndvi", esri_satellite_url)
                    truecolor_img = latest["image"].get("truecolor", esri_satellite_url)
                    
                    # Fetch NDVI statistics
                    ndvi_val = sim_ndvi
                    if "stats" in latest:
                        ndvi_val = round(latest.get("stats", {}).get("ndvi", sim_ndvi), 2)
                        if ndvi_val <= 0: ndvi_val = sim_ndvi
                    
                    pass_dt = datetime.fromtimestamp(latest["dt"], IST).strftime("%B %d, %Y")
                    
                    return {
                        "is_fallback": False,
                        "ndvi_image": ndvi_img,
                        "truecolor_image": truecolor_img,
                        "ndvi_index": ndvi_val,
                        "moisture_index": sim_moisture,
                        "cloud_cover": round(latest.get("cl", 0.0), 1),
                        "satellite_name": "Sentinel-2 L2A",
                        "pass_date": pass_dt,
                        "lat": lat,
                        "lon": lon
                    }
    except Exception as e:
        print(f"Error fetching satellite images: {e}")

    # General fallback
    return {
        "is_fallback": True,
        "ndvi_image": esri_satellite_url,
        "truecolor_image": esri_satellite_url,
        "ndvi_index": sim_ndvi,
        "moisture_index": sim_moisture,
        "cloud_cover": sim_cl,
        "satellite_name": "Sentinel-2 L2A (Esri)",
        "pass_date": datetime.now(IST).strftime("%B %d, %Y"),
        "lat": lat,
        "lon": lon
    }
