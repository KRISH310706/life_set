"""
LifeSet API - Vercel Serverless Function with Email OTP
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import hashlib
import json
import time
import base64
import random
import string
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (note: resets on each deployment)
users_db: Dict[str, dict] = {}
health_data_db: Dict[int, dict] = {}

# Environment variables
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def make_token(user_id: int, email: str, role: str) -> str:
    payload = json.dumps({"user_id": user_id, "email": email, "role": role})
    return base64.b64encode(payload.encode()).decode()

def decode_token(token: str) -> Optional[dict]:
    try:
        return json.loads(base64.b64decode(token.encode()).decode())
    except:
        return None

def gen_otp():
    return ''.join(random.choices(string.digits, k=6))

async def send_otp_email(email: str, otp: str, name: str) -> bool:
    """Send OTP email using Resend API"""
    if not RESEND_API_KEY:
        print("RESEND_API_KEY not configured")
        return False
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e, #10b981); padding: 30px; border-radius: 15px; text-align: center;">
            <h1 style="color: white; margin: 0;">LifeSet</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 5px;">Your Health, Our Priority</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 15px 15px;">
            <h2 style="color: #1f2937;">Hello {name}! 👋</h2>
            <p style="color: #4b5563;">Your verification code for LifeSet is:</p>
            <div style="background: white; border: 2px dashed #22c55e; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22c55e;">{otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
    </div>
    """
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "LifeSet <onboarding@resend.dev>",
                    "to": [email],
                    "subject": f"Your LifeSet Verification Code: {otp}",
                    "html": html_content
                },
                timeout=10
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"Email error: {e}")
        return False

@app.get("/")
@app.get("/api")
def root():
    return {"message": "LifeSet API running!", "status": "healthy"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# ============ AUTH ENDPOINTS ============
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "patient"
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital_affiliation: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    if req.email in users_db:
        raise HTTPException(400, "Email already registered")
    
    user_id = len(users_db) + 1
    otp = gen_otp()
    otp_expiry = time.time() + 600  # 10 minutes
    
    users_db[req.email] = {
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "specialization": req.specialization,
        "license_number": req.license_number,
        "hospital_affiliation": req.hospital_affiliation,
        "otp_code": otp,
        "otp_expiry": otp_expiry,
        "is_verified": False
    }
    
    # Send OTP email
    email_sent = await send_otp_email(req.email, otp, req.name)
    
    if not email_sent:
        # If email fails, still create account but warn user
        return {
            "token": make_token(user_id, req.email, req.role),
            "user_id": user_id,
            "name": req.name,
            "email": req.email,
            "role": req.role,
            "is_verified": False,
            "email_sent": False,
            "message": "Account created but email could not be sent. Please use resend OTP."
        }
    
    return {
        "token": make_token(user_id, req.email, req.role),
        "user_id": user_id,
        "name": req.name,
        "email": req.email,
        "role": req.role,
        "is_verified": False,
        "email_sent": True
    }

@app.post("/api/auth/register-doctor")
async def register_doctor(req: RegisterRequest):
    req.role = "doctor"
    return await register(req)

@app.post("/api/auth/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    user = users_db.get(req.email)
    if not user:
        raise HTTPException(404, "User not found")
    
    if str(user["otp_code"]) != str(req.otp).strip():
        raise HTTPException(400, "Incorrect OTP. Please check your email and try again.")
    
    if time.time() > user["otp_expiry"]:
        raise HTTPException(400, "OTP has expired. Click Resend OTP to get a new one.")
    
    user["is_verified"] = True
    user["otp_code"] = None
    
    return {"message": "Email verified! Welcome to LifeSet 🎉", "verified": True}

@app.post("/api/auth/resend-otp")
async def resend_otp(email: str):
    user = users_db.get(email)
    if not user:
        raise HTTPException(404, "Email not found")
    
    otp = gen_otp()
    user["otp_code"] = otp
    user["otp_expiry"] = time.time() + 600
    
    email_sent = await send_otp_email(email, otp, user["name"])
    
    if not email_sent:
        raise HTTPException(400, "Failed to send OTP email. Please try again.")
    
    return {"message": "New OTP sent to your email!", "email_sent": True}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = users_db.get(req.email)
    if not user or user["password_hash"] != hash_password(req.password):
        raise HTTPException(401, "Invalid email or password")
    
    return {
        "token": make_token(user["id"], req.email, user["role"]),
        "user_id": user["id"],
        "name": user["name"],
        "email": req.email,
        "role": user["role"],
        "is_verified": user["is_verified"]
    }

@app.get("/api/auth/me")
async def get_me(token: str = ""):
    data = decode_token(token)
    if not data:
        raise HTTPException(401, "Invalid token")
    
    for email, user in users_db.items():
        if user["id"] == data["user_id"]:
            return {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "phone": user.get("phone"),
                "role": user["role"],
                "is_verified": user["is_verified"]
            }
    raise HTTPException(404, "User not found")

@app.get("/api/auth/doctors")
async def list_doctors():
    doctors = []
    for email, user in users_db.items():
        if user["role"] == "doctor":
            doctors.append({
                "id": user["id"],
                "name": user["name"],
                "specialization": user.get("specialization"),
                "hospital_affiliation": user.get("hospital_affiliation")
            })
    return doctors

# ============ CHATBOT ENDPOINT ============
class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    language: str = "en"

SYSTEM_PROMPT = """You are LifeSet Health Assistant — a warm, caring AI health assistant.
- Answer health questions with accurate, helpful guidance
- Be warm, conversational, and easy to understand
- For serious symptoms, always recommend seeing a doctor
- End health advice with: "Please consult your doctor for personalized advice."
"""

@app.post("/api/chatbot/chat")
async def chat(req: ChatRequest):
    if GROQ_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                messages = [{"role": "system", "content": SYSTEM_PROMPT}]
                for h in req.history[-10:]:
                    role = "assistant" if h.get("role") == "assistant" else "user"
                    messages.append({"role": role, "content": h.get("content", "")})
                messages.append({"role": "user", "content": req.message})
                
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": messages,
                        "max_tokens": 1024,
                        "temperature": 0.7
                    },
                    timeout=30
                )
                if resp.status_code == 200:
                    return {"reply": resp.json()["choices"][0]["message"]["content"]}
        except Exception as e:
            print(f"Groq error: {e}")
    
    return {"reply": f"Thanks for asking about '{req.message}'. Please consult a doctor for medical advice."}

# ============ HEALTH ENDPOINTS ============
@app.get("/api/health/score/{user_id}")
def get_health_score(user_id: int):
    return {
        "overall_score": 75,
        "risks": {"heart": 30, "diabetes": 25, "stroke": 20, "blood_pressure": 35},
        "categories": {"heart": 70, "nutrition": 65, "fitness": 60, "sleep": 75, "mental": 80}
    }

@app.get("/api/health/risk/{user_id}")
def get_risk(user_id: int):
    return {
        "risks": [
            {"condition": "Heart Disease", "risk_level": "Low", "score": 30},
            {"condition": "Diabetes", "risk_level": "Low", "score": 25},
            {"condition": "Hypertension", "risk_level": "Moderate", "score": 45}
        ],
        "recommendations": ["Exercise 30 minutes daily", "Reduce salt intake", "Eat more vegetables"]
    }

@app.get("/api/wellness/tips")
def get_tips():
    return {
        "tips": [
            {"id": 1, "tip": "Drink 8 glasses of water daily", "icon": "💧"},
            {"id": 2, "tip": "Walk 30 minutes every day", "icon": "🚶"},
            {"id": 3, "tip": "Get 7-8 hours of sleep", "icon": "😴"},
            {"id": 4, "tip": "Eat 5 servings of fruits and vegetables", "icon": "🥗"}
        ]
    }

@app.get("/api/wellness/health-score/{user_id}")
def get_wellness_score(user_id: int):
    return get_health_score(user_id)

@app.get("/api/alerts/{user_id}")
def get_alerts(user_id: int):
    return {
        "alerts": [
            {"id": 1, "message": "Stay hydrated!", "type": "tip", "severity": "info"},
            {"id": 2, "message": "Time for your daily walk", "type": "reminder", "severity": "info"}
        ]
    }

@app.get("/api/map/hospitals")
def get_hospitals(lat: float = 28.6139, lng: float = 77.2090):
    return {
        "hospitals": [
            {"id": 1, "name": "City Hospital", "lat": lat + 0.01, "lng": lng + 0.01, "type": "hospital"},
            {"id": 2, "name": "Health Clinic", "lat": lat - 0.01, "lng": lng + 0.02, "type": "clinic"},
            {"id": 3, "name": "Pharmacy Plus", "lat": lat + 0.02, "lng": lng - 0.01, "type": "pharmacy"}
        ]
    }
