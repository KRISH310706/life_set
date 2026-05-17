from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from database import init_db
from routes import auth, health, reports, map_data, alerts, chatbot, wellness
from routes import access_control, chat_service, rating_service, life_print

app = FastAPI(title="LifeSet API", version="3.0.0")

# CORS - Allow all origins in production for flexibility
# In production, you can restrict this to your frontend domain
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
    "https://lifeset-frontend.onrender.com",  # Render frontend
    "https://*.onrender.com",  # All Render subdomains
    "https://*.vercel.app",    # Vercel deployments
]

# If FRONTEND_URL env var is set, add it to allowed origins
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now (you can restrict later)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(auth.router,            prefix="/api/auth",    tags=["auth"])
app.include_router(health.router,          prefix="/api/health",  tags=["health"])
app.include_router(reports.router,         prefix="/api/reports", tags=["reports"])
app.include_router(map_data.router,        prefix="/api/map",     tags=["map"])
app.include_router(alerts.router,          prefix="/api/alerts",  tags=["alerts"])
app.include_router(chatbot.router,         prefix="/api/chatbot", tags=["chatbot"])
app.include_router(wellness.router,        prefix="/api/wellness",tags=["wellness"])
app.include_router(access_control.router,  prefix="/api/access",  tags=["access"])
app.include_router(chat_service.router,    prefix="/api/chat",    tags=["chat"])
app.include_router(rating_service.router,  prefix="/api/ratings",    tags=["ratings"])
app.include_router(life_print.router,      prefix="/api/life-print", tags=["life-print"])

@app.get("/")
def root():
    return {"message": "LifeSet API v3.0 running", "status": "healthy", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
