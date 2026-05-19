"""
LifeSet API - Vercel Serverless Function
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
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
    return {"message": "LifeSet API running on Vercel", "status": "healthy"}

@app.get("/api")
def api_root():
    return {"status": "ok", "version": "3.0.0"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

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
            "reply": f"Thank you for your question. I'm your LifeSet Health Assistant. For accurate health advice, please consult with a healthcare professional.",
            "source": "fallback"
        }
    except Exception as e:
        return {
            "reply": "I'm here to help with your health questions. Could you please rephrase your question?",
            "source": "error"
        }

# ============ SIMPLE AUTH (for demo) ============
users_db = {}

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "patient"

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    if req.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[req.email] = {
        "name": req.name,
        "email": req.email,
        "password": req.password,
        "role": req.role
    }
    return {"message": "Registration successful", "token": f"demo-token-{req.email}"}

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = users_db.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": f"demo-token-{req.email}",
        "user": {"name": user["name"], "email": user["email"], "role": user["role"]}
    }

@app.get("/api/auth/me")
async def get_me():
    return {"name": "Demo User", "email": "demo@example.com", "role": "patient"}
