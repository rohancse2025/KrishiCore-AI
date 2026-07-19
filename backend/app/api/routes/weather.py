import os
import json
import logging
import urllib.request
import urllib.error
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Use redirect_slashes=False so /weather and /weather/ both work without 307
router = APIRouter(redirect_slashes=False)

class WeatherResponse(BaseModel):
    temperature: float
    humidity: int
    wind_speed: float
    condition: str
    city: str
    farming_tip: str

def get_farming_tip(temp: float, humidity: int, condition: str) -> str:
    condition_lower = condition.lower()
    if "rain" in condition_lower or "shower" in condition_lower:
        return "Rain expected. Delay spraying fertilizers or pesticides, and ensure field drainage."
    elif "storm" in condition_lower or "thunder" in condition_lower:
        return "Thunderstorm detected. Secure tall crops, postpone spraying, and protect young plants."
    elif "wind" in condition_lower:
        return "Strong winds detected. Avoid spraying chemicals and support any tall or fragile crops."
    elif humidity > 80:
        return "High humidity detected. Watch out for fungal diseases; avoid overhead irrigation today."
    elif temp > 35:
        return "High temperatures. Ensure adequate soil moisture; water early morning or late evening."
    elif temp < 10:
        return "Low temperatures. Protect sensitive crops from frost and reduce irrigation frequency."
    else:
        return "Weather conditions are optimal. Continue standard farming practices."

@router.get("", response_model=WeatherResponse)
@router.get("/", response_model=WeatherResponse)
async def get_weather(
    lat: float = Query(None), 
    lon: float = Query(None),
    city: str = Query(None)
):
    api_key = os.environ.get("OPENWEATHER_API_KEY", "").strip()

    if not api_key:
        logger.error("OPENWEATHER_API_KEY is missing or empty in environment")
        raise HTTPException(
            status_code=500,
            detail="OPENWEATHER_API_KEY is not set. Add it to backend/.env and restart the server."
        )

    if city:
        logger.info(f"Fetching weather for city={city} (key ends with ...{api_key[-4:]})")
        # Ensure proper URL encoding for city names with spaces
        import urllib.parse
        encoded_city = urllib.parse.quote(city)
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?q={encoded_city}&appid={api_key}&units=metric"
        )
    else:
        # Fallback to default Ludhiana if neither is provided
        use_lat = lat if lat is not None else 30.9010
        use_lon = lon if lon is not None else 75.8573
        logger.info(f"Fetching weather for lat={use_lat}, lon={use_lon} (key ends with ...{api_key[-4:]})")
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?lat={use_lat}&lon={use_lon}&appid={api_key}&units=metric"
        )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read().decode()
            data = json.loads(raw)

    except urllib.error.HTTPError as e:
        # Read the OWM error body so we can surface the exact reason
        error_body = ""
        try:
            error_body = e.read().decode()
            error_data = json.loads(error_body)
            detail = f"OpenWeatherMap error {e.code}: {error_data.get('message', error_body)}"
        except Exception:
            detail = f"OpenWeatherMap error {e.code}: {error_body or str(e)}"
        logger.error(detail)
        raise HTTPException(status_code=e.code if e.code < 600 else 502, detail=detail)

    except urllib.error.URLError as e:
        detail = f"Network error reaching OpenWeatherMap: {str(e.reason)}"
        logger.error(detail)
        raise HTTPException(status_code=502, detail=detail)

    except Exception as e:
        detail = f"Unexpected error: {str(e)}"
        logger.error(detail)
        raise HTTPException(status_code=500, detail=detail)

    temp       = data["main"]["temp"]
    humidity   = data["main"]["humidity"]
    wind_speed = data["wind"]["speed"]
    condition  = data["weather"][0]["description"].title()

    # OpenWeatherMap's `name` field can be a large administrative area.
    # To get a more specific locality (village/town), attempt reverse geocoding
    # using Nominatim (OpenStreetMap) and prefer village/town/hamlet if available.
    city = data.get("name", "Unknown")
    try:
        coord = data.get('coord', {})
        lat = coord.get('lat')
        lon = coord.get('lon')
        if lat is not None and lon is not None:
            nom_url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}"
            req = urllib.request.Request(nom_url, headers={"User-Agent": "KisanCore/1.0 (+https://kisancore.ai)"})
            with urllib.request.urlopen(req, timeout=5) as nomresp:
                nom_raw = nomresp.read().decode()
                nom = json.loads(nom_raw)
                addr = nom.get('address', {}) or {}
                # preference order for most specific locality
                for key in ['village', 'town', 'hamlet', 'suburb', 'city', 'county', 'state_district', 'state']:
                    if addr.get(key):
                        city = addr.get(key)
                        break
    except Exception as _:
        # If reverse geocoding fails, silently fall back to OWM's name
        pass

    tip = get_farming_tip(temp, humidity, condition)

    return WeatherResponse(
        temperature=temp,
        humidity=humidity,
        wind_speed=wind_speed,
        condition=condition,
        city=city,
        farming_tip=tip
    )
