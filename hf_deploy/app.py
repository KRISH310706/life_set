"""
LifeSet API - Simplified for Hugging Face Spaces
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="LifeSet API", version="2.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "LifeSet API is running on Hugging Face!"}

@app.get("/api")
def api_root():
    return {"status": "ok", "version": "2.0", "endpoints": ["/api/health", "/api/chatbot"]}

# Simple health check
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# ============ CHATBOT ENDPOINT ============
from pydantic import BaseModel
from typing import List, Optional
import json

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
"""

@app.post("/api/chatbot/chat")
async def chat(req: ChatRequest):
    try:
        if GROQ_API_KEY:
            # Try Groq API
            import httpx
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
        
        # Fallback response
        return {
            "reply": f"Thank you for your question about '{req.message}'. I'm your LifeSet Health Assistant. For accurate health advice, please consult with a healthcare professional. Is there anything specific about your health I can help explain?",
            "source": "fallback"
        }
    except Exception as e:
        return {
            "reply": "I'm here to help with your health questions. Could you please rephrase your question?",
            "source": "error",
            "error": str(e)
        }

# Run with: uvicorn app:app --host 0.0.0.0 --port 7860
