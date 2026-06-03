"""
LifeSet API - Vercel Serverless Function
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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
users_db: Dict[str, dict] = {}
health_data_db: Dict[int, dict] = {}

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def make_token(user_id: int, email: str, role: str) -> str:
    payload = json.dumps({"user_id": user_id, "email": email, "role": role})
    return base64.b64encode(payload.encode()).decode()

@app.get("/")
@app.get("/api")
def root():
    return {"message": "LifeSet API running!", "status": "healthy"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# Auth
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "patient"

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    if req.email in users_db:
        raise HTTPException(400, "Email already registered")
    user_id = len(users_db) + 1
    users_db[req.email] = {
        "id": user_id, "name": req.name, "email": req.email,
        "password_hash": hash_password(req.password), "role": req.role,
        "is_verified": True
    }
    return {"token": make_token(user_id, req.email, req.role), "user_id": user_id,
            "name": req.name, "email": req.email, "role": req.role, "is_verified": True}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = users_db.get(req.email)
    if not user or user["password_hash"] != hash_password(req.password):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(user["id"], req.email, user["role"]),
            "user_id": user["id"], "name": user["name"], "email": req.email,
            "role": user["role"], "is_verified": True}

@app.get("/api/auth/me")
def get_me(token: str = ""):
    return {"id": 1, "name": "User", "email": "user@example.com", "role": "patient"}

# Chatbot
class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    language: str = "en"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

@app.post("/api/chatbot/chat")
async def chat(req: ChatRequest):
    if GROQ_API_KEY:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    json={"model": "llama-3.1-8b-instant", 
                          "messages": [{"role": "system", "content": "You are LifeSet Health Assistant."},
                                      {"role": "user", "content": req.message}],
                          "max_tokens": 1024},
                    timeout=30
                )
                if resp.status_code == 200:
                    return {"reply": resp.json()["choices"][0]["message"]["content"]}
        except:
            pass
    return {"reply": f"Thanks for asking about '{req.message}'. Please consult a doctor for medical advice."}

# Health
@app.get("/api/health/score/{user_id}")
def get_health_score(user_id: int):
    return {"overall_score": 75, "risks": {"heart": 30, "diabetes": 25, "stroke": 20}}

@app.get("/api/health/risk/{user_id}")
def get_risk(user_id: int):
    return {"risks": [{"condition": "Heart Disease", "risk_level": "Low", "score": 30}],
            "recommendations": ["Exercise regularly", "Eat healthy"]}

@app.get("/api/wellness/tips")
def get_tips():
    return {"tips": [{"tip": "Drink 8 glasses of water daily"},
                     {"tip": "Walk 30 minutes every day"}]}

@app.get("/api/alerts/{user_id}")
def get_alerts(user_id: int):
    return {"alerts": [{"message": "Stay hydrated!", "type": "tip"}]}
