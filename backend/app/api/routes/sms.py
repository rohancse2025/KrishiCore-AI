from fastapi import APIRouter, Form
from pydantic import BaseModel
import os
import logging
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from fastapi.responses import Response

from pathlib import Path
load_dotenv() # Fallback
# Explicitly load from backend/.env if possible
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()

# Twilio Config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_SMS_FROM = os.getenv("TWILIO_SMS_FROM", "")

logger = logging.getLogger(__name__)

class SMSRequest(BaseModel):
  to_phone: str
  message_type: str
  data: dict

from app.utils.sms_utils import send_sms_twilio, send_whatsapp_message

def send_sms(to: str, message: str) -> bool:
  success, _ = send_sms_twilio(to, message)
  return success

@router.post("/send")
@router.post("/sms/send")  # Support both paths
def send_alert(req: SMSRequest):
  msg = ""
  
  if req.message_type == "irrigation":
    soil = req.data.get("soil_moisture", 0)
    temp = req.data.get("temperature", 0)
    if soil < 30:
      msg = (f"KrishiCore ALERT: Your farm soil "
        f"moisture is {soil}% - Too DRY! "
        f"Please irrigate crops immediately. "
        f"Temp: {temp}C. -KrishiCore AI")
    elif soil > 70:
      msg = (f"KrishiCore ALERT: Soil moisture "
        f"is {soil}% - Too WET! "
        f"Stop irrigation, check drainage. "
        f"-KrishiCore AI")
    else:
      msg = (f"KrishiCore: Farm update - "
        f"Soil moisture {soil}%, Temp {temp}C. "
        f"Conditions are optimal today. "
        f"-KrishiCore AI")
        
  elif req.message_type == "crop":
    crop = req.data.get("crop", "Unknown")
    confidence = req.data.get("confidence", 0)
    msg = (f"KrishiCore Crop Advice: Based on "
      f"your soil data, best crop to grow is "
      f"{crop} ({confidence}% match). "
      f"Visit app for full details. "
      f"-KrishiCore AI")
      
  elif req.message_type == "market":
    commodity = req.data.get("commodity", "")
    price = req.data.get("price", 0)
    trend = req.data.get("trend", "stable")
    msg = (f"KrishiCore Market: {commodity} "
      f"price today Rs.{price}/quintal "
      f"({trend}). Check market page for "
      f"all mandi prices. -KrishiCore AI")
      
  elif req.message_type == "weather":
    temp = req.data.get("temperature", 0)
    condition = req.data.get("condition", "")
    tip = req.data.get("tip", "")
    msg = (f"KrishiCore Weather: Today {temp}C "
      f"{condition}. Tip: {tip} "
      f"-KrishiCore AI")
      
  elif req.message_type == "disease":
    disease = req.data.get("disease", "")
    treatment = req.data.get("treatment", "")
    msg = (f"KrishiCore Disease Alert: "
      f"{disease} detected on your crop. "
      f"Treatment: {treatment} "
      f"-KrishiCore AI")

  if not msg:
    return {"status": "error", "message": "Unknown message type"}
    
  success = send_sms(req.to_phone, msg)
  return {"status": "sent" if success else "failed"}

@router.post("/daily-summary")
def daily_summary(phone: str, 
  temperature: float, humidity: float,
  soil_moisture: float, top_crop: str):
  msg = (
    f"KrishiCore Daily Summary:\n"
    f"Farm: Temp {temperature}C, "
    f"Humidity {humidity}%\n"
    f"Soil: {soil_moisture}% moisture\n"
    f"Best crop: {top_crop}\n"
    f"Irrigation: "
    f"{'ON - Irrigate now' if soil_moisture < 30 else 'OFF - OK'}\n"
    f"-KrishiCore AI")
  success = send_sms(phone, msg)
  return {"status": "sent" if success else "failed"}

@router.post("/webhook")
async def handle_incoming_whatsapp(
    From: str = Form(...),
    Body: str = Form("")
):
    try:
        import app.api.routes.iot as iot
        import time
        
        # Ensure we have the latest state from other workers/sessions before processing
        iot.load_persistence()

        sender = From.strip()
        text = Body.strip().upper()
        # V2 Tag helps confirm the new code is actually running
        logger.info(f"[V2] RECEIVED WHATSAPP: From={sender}, Body='{text}'")

        # AUTO-REGISTER this number for smart alerts
        if "farmer_phones" not in iot.latest_reading:
            iot.latest_reading["farmer_phones"] = []
        if sender not in iot.latest_reading["farmer_phones"]:
            iot.latest_reading["farmer_phones"].append(sender)
            iot.save_persistence()
        
        response_msg = ""

        # Robust command matching
        is_pump_on = "PUMP ON" in text or (("PUMP" in text or "MOTOR" in text) and "ON" in text and "OFF" not in text)
        is_pump_off = "PUMP OFF" in text or (("PUMP" in text or "MOTOR" in text) and "OFF" in text)

        if is_pump_on:
            last_seen = iot.latest_reading.get("timestamp", "Never")
            soil = iot.latest_reading.get("soil_moisture", 0)
            if last_seen == "Never":
                response_msg = "⚠️ Cannot activate pump. No data received from your farm yet. Please check your device connection. - KrishiCore AI"
            elif soil == 0.0:
                response_msg = "⚠️ Cannot activate pump. Soil sensor is disconnected. Pump is disabled for safety. - KrishiCore AI"
            else:
                duration = 60
                parts = text.split()
                for p in parts:
                    if p.isdigit():
                        duration = int(p)
                        break
                iot.latest_reading["manual_override"] = "ON"
                iot.latest_reading["override_expiry_time"] = time.time() + (duration * 60)
                iot.save_persistence() # CRITICAL: Save to disk for other workers
                response_msg = f"KrishiCore [V2.3]: Pump activated for {duration} mins. 💧"

        elif is_pump_off:
            last_seen = iot.latest_reading.get("timestamp", "Never")
            soil = iot.latest_reading.get("soil_moisture", 0)
            if last_seen == "Never":
                response_msg = "⚠️ Cannot communicate with pump. No data received from your farm yet. - KrishiCore AI"
            elif soil == 0.0:
                iot.latest_reading["manual_override"] = "OFF"
                iot.latest_reading["override_expiry_time"] = time.time() + 86400
                iot.save_persistence() # CRITICAL: Save to disk for other workers
                response_msg = "KrishiCore [V2.3]: Pump is already disabled due to disconnected sensor, but manual OFF state is saved. 🛑"
            else:
                iot.latest_reading["manual_override"] = "OFF"
                iot.latest_reading["override_expiry_time"] = time.time() + 86400
                iot.save_persistence() # CRITICAL: Save to disk for other workers
                response_msg = "KrishiCore [V2.3]: Pump turned OFF manually. 🛑"

        elif "AUTO" in text:
            last_seen = iot.latest_reading.get("timestamp", "Never")
            if last_seen == "Never":
                response_msg = "⚠️ Cannot change mode. No data received from your farm yet. - KrishiCore AI"
            else:
                iot.latest_reading["manual_override"] = None
                iot.latest_reading["override_expiry_time"] = 0
                iot.save_persistence()
                response_msg = "KrishiCore [V2.3]: Pump restored to Autonomous AI Mode. 🤖"

        elif "STATUS" in text:
            temp = iot.latest_reading.get("temperature", 0)
            hum  = iot.latest_reading.get("humidity", 0)
            soil = iot.latest_reading.get("soil_moisture", 0)
            mode = iot.latest_reading.get("manual_override") or "AUTO"
            irr  = "ON" if iot.latest_reading.get("irrigation_needed") else "OFF"
            last_seen = iot.latest_reading.get("timestamp", "Never")
            suggestion = iot.latest_reading.get("suggestion", "")
            sensor_ok = soil > 0.0

            if last_seen == "Never":
                response_msg = (
                    "⚠️ Farm Status Unavailable:\n"
                    "No data received from your farm yet. Please ensure your KrishiCore device is powered on and connected to WiFi.\n"
                    "🕒 Last Update: Never\n"
                    "- KrishiCore AI"
                )
            elif not sensor_ok:
                response_msg = (
                    f"⚠️ Farm Status (Partial):\n"
                    f"🌡️ Temp: {temp}°C\n"
                    f"💧 Humidity: {hum}%\n"
                    f"🪴 Soil Sensor: DISCONNECTED\n"
                    f"⚡ Pump: OFF (auto-disabled - no soil data)\n"
                    f"⚙️ Mode: {mode}\n"
                    f"🕒 Last Update: {last_seen}\n"
                    f"⚠️ Please reconnect your soil sensor cable to GPIO 34.\n"
                    f"- KrishiCore AI"
                )
            else:
                response_msg = (
                    f"🌿 Farm Status:\n"
                    f"🌡️ Temp: {temp}°C\n"
                    f"💧 Humidity: {hum}%\n"
                    f"🪴 Soil: {soil}%\n"
                    f"⚡ Pump: {irr}\n"
                    f"⚙️ Mode: {mode}\n"
                    f"🕒 Last Update: {last_seen}\n"
                    f"- KrishiCore AI"
                )

        elif "DAILY" in text:
            last_seen = iot.latest_reading.get("timestamp", "Never")
            if last_seen == "Never":
                response_msg = "📊 Daily Report: No data has been recorded for your farm yet today. - KrishiCore AI"
            else:
                temp = iot.latest_reading.get("temperature", 0)
                hum  = iot.latest_reading.get("humidity", 0)
                soil = iot.latest_reading.get("soil_moisture", 0)
                irr  = "ON" if iot.latest_reading.get("irrigation_needed") else "OFF"
                mode = iot.latest_reading.get("manual_override") or "AUTO"
                sensor_ok = soil > 0.0
                soil_display = f"{soil}%" if sensor_ok else "DISCONNECTED"
                irr_display = irr if sensor_ok else "OFF (no soil data)"
                response_msg = (
                    f"📊 KrishiCore Daily Report:\n"
                    f"Temp: {temp}°C | Humidity: {hum}%\n"
                    f"Soil: {soil_display} | Pump: {irr_display}\n"
                    f"Mode: {mode}\n"
                    f"Send HELP for commands.\n"
                    f"- KrishiCore AI"
                )

        elif "HELP" in text:
            response_msg = (
                "📖 KrishiCore Commands:\n"
                "• STATUS - Live data\n"
                "• PUMP ON - Start pump\n"
                "• PUMP ON 30 - Run for 30m\n"
                "• PUMP OFF - Stop pump\n"
                "• AUTO - AI control\n"
                "• DAILY - Summary"
            )

        elif "START" in text or "REGISTER" in text or "HELLO" in text:
            # Generate a deep link to the registration page with the phone pre-filled
            clean_sender = sender.replace("whatsapp:+", "")
            reg_link = f"https://KrishiCore-ai.vercel.app/login?register=true&phone={clean_sender}&whatsapp=true"
            response_msg = (
                f"👋 Welcome to KrishiCore AI!\n\n"
                f"To finish setting up your smart farm dashboard, please click the link below:\n"
                f"{reg_link}\n\n"
                f"Once registered, you can send 'STATUS' here anytime. 🌾"
            )

        else:
            response_msg = "❓ Unknown command. Send HELP for list, or START to register. - KrishiCore AI"

        # Construct TwiML
        xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{response_msg}</Message>
</Response>"""
        
        return Response(content=xml_response, media_type="text/xml")

    except Exception as e:
        logger.error(f"WEBHOOK ERROR: {str(e)}")
        error_xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>KrishiCore Error: Internal server error.</Message></Response>'
        return Response(content=error_xml, media_type="text/xml")

@router.get("/status")
def sms_status():
    """Check if Twilio credentials are configured"""
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")  
    from_num = os.getenv("TWILIO_SMS_FROM", "")
    
    configured = bool(sid and token and from_num and 
                      not sid.startswith("ACxx") and 
                      token != "your_auth_token_here")
    
    # Import iot dynamically to get current state
    import app.api.routes.iot as iot_module
    
@router.get("/status")
async def sms_status():
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    whatsapp_from = os.getenv("TWILIO_WHATSAPP_FROM")
    
    return {
        "configured": bool(account_sid and auth_token),
        "account_sid_present": bool(account_sid),
        "auth_token_present": bool(auth_token),
        "whatsapp_from_present": bool(whatsapp_from),
        "whatsapp_from": whatsapp_from or "NOT SET",
        "instructions": "If any 'present' is false, add them to Render Dashboard -> Environment Variables"
    }

@router.get("/test")
def test_sms(phone: str):
    # First check config
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    if not sid or sid.startswith("ACxx"):
        return {
            "status": "not_configured",
            "message": "Twilio not set up yet",
            "fix": "1. Go to twilio.com → sign up free\n2. Get Account SID and Auth Token from dashboard\n3. Get a free phone number\n4. Add all 3 to backend/.env\n5. Add your phone to Twilio verified callers\n6. Restart uvicorn server"
        }
    success, detail = send_sms_twilio(phone, "KrishiCore: SMS test successful! Your alerts are working. 🌾 -KrishiCore AI")
    return {
        "status": "success" if success else "error",
        "message": f"SMS sent to {phone}" if success else "SMS failed",
        "detail": detail,
        "fix": None if success else "Check that your phone number is verified in Twilio console (trial accounts can only send to verified numbers)"
    }
