import os
import datetime
import bcrypt
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db, Farmer, FarmerHistory, CropRecord

router = APIRouter()

# --- CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "kisancore-secret-key-2024")
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# --- MODELS ---
class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str
    location: str = ""
    farm_size: float = 0.0

class LoginRequest(BaseModel):
    phone: str
    password: str

class UpdateProfileRequest(BaseModel):
    name: str = ""
    location: str = ""
    farm_size: float = 0.0
    farm_size_unit: str = "acres"
    soil_type: str = ""
    primary_crop: str = ""
    active_crops: str = "[]"
    irrigation_type: str = ""
    soil_ph: float = 6.5
    nitrogen: float = 50.0
    potassium: float = 40.0
    sms_alerts_enabled: str = "false"
    sms_phone: str = ""

# --- AUTH UTILS ---
def create_token(phone: str):
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    return jwt.encode(
        {"sub": phone, "exp": expire}, 
        SECRET_KEY, algorithm=ALGORITHM)

async def get_current_farmer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
    if farmer is None:
        raise credentials_exception
    return farmer

def get_current_phone(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone = payload.get("sub")
        if not phone:
            raise HTTPException(401, detail="Invalid token")
        return phone
    except JWTError:
        raise HTTPException(401, detail="Invalid or expired token")

# --- ROUTES ---

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    import re
    clean_phone = re.sub(r'\D', '', req.phone.strip())
    if clean_phone.startswith('91') and len(clean_phone) > 10: clean_phone = clean_phone[2:]
    
    if not re.match(r'^[6-9]\d{9}$', clean_phone):
        raise HTTPException(400, detail="Invalid Indian phone number. Please enter a 10-digit number.")
    
    existing = db.query(Farmer).filter(Farmer.phone == clean_phone).first()
    if existing:
        raise HTTPException(400, detail="Phone already registered")
    
    hashed_pw = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    farmer = Farmer(
        name=req.name, phone=req.phone,
        password_hash=hashed_pw,
        location=req.location,
        farm_size=req.farm_size)
    
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    
    # --- AUTO-REGISTER FOR WHATSAPP ALERTS ---
    try:
        from app.utils.sms_utils import send_whatsapp_message
        import app.api.routes.iot as iot
        
        # 1. Update IoT alert recipient list
        whatsapp_phone = f"whatsapp:+91{clean_phone}"
        if "farmer_phones" not in iot.latest_reading:
            iot.latest_reading["farmer_phones"] = []
        if whatsapp_phone not in iot.latest_reading["farmer_phones"]:
            iot.latest_reading["farmer_phones"].append(whatsapp_phone)
        
        # 2. Send Welcome Message
        welcome_msg = (
            f"🌿 Welcome to KisanCore AI, {req.name}!\n\n"
            f"Your account is now active. You will receive smart alerts here for your farm.\n"
            f"Send 'STATUS' anytime to get live data from your sensors.\n\n"
            f"Happy Farming! 👨‍🌾🚜"
        )
        send_whatsapp_message(whatsapp_phone, welcome_msg)
    except Exception as e:
        # Don't fail registration if SMS fails, just log it
        print(f"WhatsApp Welcome Error: {e}")
    
    return {
        "token": create_token(req.phone),
        "farmer": farmer
    }

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.phone == req.phone).first()
    if not farmer:
        raise HTTPException(401, detail="Wrong phone or password")
    
    is_valid = bcrypt.checkpw(req.password.encode('utf-8'), farmer.password_hash.encode('utf-8'))
    if not is_valid:
        raise HTTPException(401, detail="Wrong phone or password")
        
    return {
        "token": create_token(req.phone),
        "farmer": farmer
    }

@router.get("/profile")
def get_profile(phone: str = Depends(get_current_phone), db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
    if not farmer:
        raise HTTPException(404, detail="Farmer not found")
    return farmer

@router.put("/profile")
def update_profile(req: UpdateProfileRequest, phone: str = Depends(get_current_phone), db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
    if not farmer:
        raise HTTPException(404, detail="Farmer not found")
        
    if req.name: farmer.name = req.name
    farmer.location = req.location
    farmer.farm_size = req.farm_size
    farmer.farm_size_unit = req.farm_size_unit
    farmer.soil_type = req.soil_type
    farmer.primary_crop = req.primary_crop
    farmer.active_crops = req.active_crops
    farmer.irrigation_type = req.irrigation_type
    farmer.soil_ph = req.soil_ph
    farmer.nitrogen = req.nitrogen
    farmer.potassium = req.potassium
    farmer.sms_alerts_enabled = req.sms_alerts_enabled
    farmer.sms_phone = req.sms_phone
    
    db.commit()
    db.refresh(farmer)
    return {"status": "updated", "farmer": farmer}

@router.delete("/profile")
def delete_profile(phone: str = Depends(get_current_phone), db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
    if not farmer:
        raise HTTPException(404, detail="Farmer not found")
        
    try:
        # 1. Delete Crop Records
        db.query(CropRecord).filter(CropRecord.farmer_id == farmer.id).delete(synchronize_session=False)
        
        # 2. Delete Farmer History
        db.query(FarmerHistory).filter(FarmerHistory.farmer_id == farmer.id).delete(synchronize_session=False)
        
        # 3. Delete Farmer
        db.delete(farmer)
        db.commit()
        return {"status": "deleted"}
    except Exception as e:
        db.rollback()
        print(f"Error during account deletion: {e}")
        raise HTTPException(500, detail=f"Database error during deletion: {str(e)}")

@router.post("/history")
def save_history(farmer_id: int, type: str, data: str, current_farmer: Farmer = Depends(get_current_farmer), db: Session = Depends(get_db)):
    if current_farmer.id != farmer_id:
        raise HTTPException(status_code=403, detail="Not authorized to save history for another farmer")
        
    history = FarmerHistory(farmer_id=farmer_id, type=type, data=data)
    db.add(history)
    db.commit()
    return {"status": "saved"}

@router.get("/history/{farmer_id}")
def get_history(farmer_id: int, current_farmer: Farmer = Depends(get_current_farmer), db: Session = Depends(get_db)):
    if current_farmer.id != farmer_id:
        raise HTTPException(status_code=403, detail="Not authorized to access another farmer's history")
        
    return db.query(FarmerHistory).filter(
        FarmerHistory.farmer_id == farmer_id
    ).order_by(FarmerHistory.created_at.desc()
    ).limit(20).all()

@router.get("/farmer/{farmer_id}/crops")
def get_farmer_crops(farmer_id: int, current_farmer: Farmer = Depends(get_current_farmer), db: Session = Depends(get_db)):
    if current_farmer.id != farmer_id:
        raise HTTPException(status_code=403, detail="Not authorized to access another farmer's crops")
        
    return db.query(CropRecord).filter(
        CropRecord.farmer_id == farmer_id,
        CropRecord.status == "growing"
    ).all()

@router.post("/farmer/{farmer_id}/crops")
def add_crop(farmer_id: int, crop_name: str, planted_date: str, field_size: float = 0.0, current_farmer: Farmer = Depends(get_current_farmer), db: Session = Depends(get_db)):
    if current_farmer.id != farmer_id:
        raise HTTPException(status_code=403, detail="Not authorized to add crops for another farmer")
        
    try:
        planted = datetime.datetime.strptime(planted_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    harvest = planted + datetime.timedelta(days=120)
    crop = CropRecord(
        farmer_id=farmer_id,
        crop_name=crop_name,
        planted_date=planted_date,
        expected_harvest=harvest.strftime("%Y-%m-%d"),
        field_size=field_size,
        status="growing"
    )
    db.add(crop)
    db.commit()
    return {"status": "added", "crop": crop_name}

@router.delete("/farmer/crops/{crop_id}")
def remove_crop(crop_id: int, current_farmer: Farmer = Depends(get_current_farmer), db: Session = Depends(get_db)):
    crop = db.query(CropRecord).filter(CropRecord.id == crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop record not found")
    
    if crop.farmer_id != current_farmer.id:
        raise HTTPException(status_code=403, detail="Not authorized to remove another farmer's crop")
        
    crop.status = "harvested"
    db.commit()
    return {"status": "removed"}

@router.put("/farmer/{farmer_id}/stats")
def update_stats(farmer_id: int, scan_done: bool = False, chat_done: bool = False, current_farmer: Farmer = Depends(get_current_farmer), db: Session = Depends(get_db)):
    if current_farmer.id != farmer_id:
        raise HTTPException(status_code=403, detail="Not authorized to update another farmer's stats")
        
    if scan_done: current_farmer.total_scans += 1
    if chat_done: current_farmer.total_chats += 1
    db.commit()
    return {"status": "updated"}
