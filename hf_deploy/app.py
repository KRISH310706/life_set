"""
LifeSet API - Single File for Hugging Face Spaces
All code in one file - no external imports
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import httpx

app = FastAPI(title="LifeSet API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ BASIC ENDPOINTS ============
@app.get("/")
def root():
    return {"message": "LifeSet API running on Hugging Face!", "status": "healthy"}

@app.get("/api")
def api_root():
    return {"status": "ok", "version": "3.0.0"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# ============ IN-MEMORY DATABASE ============
users_db: Dict[str, dict] = {}
health_data_db: Dict[str, dict] = {}

# ============ AUTH ENDPOINTS ============
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "patient"
    phone: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    if req.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[req.email] = {
        "id": len(users_db) + 1,
        "name": req.name,
        "email": req.email,
        "password": req.password,
        "role": req.role,
        "phone": req.phone
    }
    return {"message": "Registration successful", "token": f"token-{req.email}"}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = users_db.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": f"token-{req.email}",
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
    }

@app.get("/api/auth/me")
async def get_me():
    return {"id": 1, "name": "Demo User", "email": "demo@example.com", "role": "patient"}

# ============ CHATBOT ENDPOINT ============
class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    health_score: Optional[dict] = None
    user_profile: Optional[dict] = None
    language: str = "en"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

SYSTEM_PROMPT = """You are LifeSet Health Assistant — a warm, caring AI health assistant.
- Answer health questions with accurate, helpful guidance
- Be warm, conversational, and easy to understand
- For serious symptoms, always recommend seeing a doctor
- End health advice with: "Please consult your doctor for personalized advice."
- If user speaks in Hindi or another language, respond in that language.
"""

@app.post("/api/chatbot/chat")
async def chat(req: ChatRequest):
    try:
        if GROQ_API_KEY:
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            for h in req.history[-10:]:
                role = "assistant" if h.get("role") == "assistant" else "user"
                messages.append({"role": role, "content": h.get("content", "")})
            messages.append({"role": "user", "content": req.message})
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": messages,
                        "max_tokens": 1024,
                        "temperature": 0.7
                    },
                    timeout=30
                )
                if resp.status_code == 200:
                    data = resp.json()
                    reply = data["choices"][0]["message"]["content"]
                    return {"reply": reply, "source": "groq"}
        
        return {
            "reply": "Thank you for your question. I'm your LifeSet Health Assistant. For accurate health advice, please consult with a healthcare professional.",
            "source": "fallback"
        }
    except Exception as e:
        return {
            "reply": "I'm here to help with your health questions. Could you please rephrase your question?",
            "source": "error"
        }

# ============ HEALTH DATA ENDPOINTS ============
class HealthData(BaseModel):
    blood_pressure: Optional[str] = None
    heart_rate: Optional[int] = None
    blood_sugar: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    notes: Optional[str] = None

@app.post("/api/health/data")
async def save_health_data(data: HealthData):
    health_data_db["latest"] = data.dict()
    return {"message": "Health data saved", "data": data.dict()}

@app.get("/api/health/data")
async def get_health_data():
    return health_data_db.get("latest", {})

@app.get("/api/health/score")
async def get_health_score():
    return {
        "overall_score": 75,
        "categories": {
            "heart": 80,
            "nutrition": 70,
            "fitness": 75,
            "sleep": 72,
            "mental": 78
        }
    }

# ============ WELLNESS ENDPOINTS ============
@app.get("/api/wellness/tips")
async def get_wellness_tips():
    return {
        "tips": [
            "Drink at least 8 glasses of water daily",
            "Take a 30-minute walk every day",
            "Get 7-8 hours of sleep",
            "Eat more fruits and vegetables",
            "Practice deep breathing for stress relief"
        ]
    }

@app.get("/api/wellness/goals")
async def get_wellness_goals():
    return {
        "goals": [
            {"id": 1, "title": "Walk 10,000 steps", "progress": 65},
            {"id": 2, "title": "Drink 8 glasses of water", "progress": 50},
            {"id": 3, "title": "Sleep 8 hours", "progress": 80}
        ]
    }

# ============ ALERTS ENDPOINTS ============
@app.get("/api/alerts")
async def get_alerts():
    return {
        "alerts": [
            {"id": 1, "type": "reminder", "message": "Time for your medication", "time": "09:00"},
            {"id": 2, "type": "checkup", "message": "Schedule your annual checkup", "time": "upcoming"}
        ]
    }

# ============ RISK ANALYSIS ============
@app.get("/api/health/risk")
async def get_risk_analysis():
    return {
        "risks": [
            {"condition": "Heart Disease", "risk_level": "Low", "score": 25},
            {"condition": "Diabetes", "risk_level": "Moderate", "score": 45},
            {"condition": "Hypertension", "risk_level": "Low", "score": 30}
        ],
        "recommendations": [
            "Maintain a balanced diet",
            "Exercise regularly",
            "Monitor blood sugar levels"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
