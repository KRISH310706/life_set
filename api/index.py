import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all routers from backend
from routes import auth, health, reports, alerts, wellness, chatbot, access, chat, ratings, life_print, map_data

# Initialize database
from database import init_db
init_db()

app = FastAPI(title="LifeSet API", version="2.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(wellness.router, prefix="/api/wellness", tags=["Wellness"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])
app.include_router(access.router, prefix="/api/access", tags=["Access"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(ratings.router, prefix="/api/ratings", tags=["Ratings"])
app.include_router(life_print.router, prefix="/api/life-print", tags=["LifePrint"])
app.include_router(map_data.router, prefix="/api/map", tags=["Map"])

@app.get("/")
def root():
    return {"status": "ok", "message": "LifeSet API is running"}

@app.get("/api")
def api_root():
    return {"status": "ok", "message": "LifeSet API v2.0"}
