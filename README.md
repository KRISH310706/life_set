# 🟢 LifeSet – AI-Powered Preventive Healthcare System

A full-stack preventive healthcare platform with AI risk prediction, lab report analysis, interactive maps, and personalized health recommendations.

> ⚠️ **Medical Disclaimer:** LifeSet provides risk predictions and general health guidance only — NOT medical diagnoses or prescriptions. Always consult a qualified healthcare professional.

---

## 🏗️ Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | FastAPI (Python 3.11)             |
| Frontend  | React 18 + Vite + Tailwind CSS    |
| Database  | SQLite (auto-created on startup)  |
| Maps      | Leaflet + OpenStreetMap (free)    |
| Charts    | Recharts                          |
| OCR       | pytesseract + Pillow (optional)   |
| Docker    | Docker + Docker Compose           |

---

## 📁 Project Structure

```
lifeset/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── database.py                # SQLite setup
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routes/
│   │   ├── auth.py                # Register/Login
│   │   ├── health.py              # Profile + Risk Analysis
│   │   ├── reports.py             # Lab Report Upload
│   │   ├── map_data.py            # Hospitals + Outbreaks
│   │   └── alerts.py              # Alerts system
│   └── services/
│       ├── prediction_engine.py   # AI Risk Scoring
│       ├── recommendation_engine.py # Personalized Advice
│       └── report_analyzer.py     # OCR + Lab Analysis
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx        # Public landing page
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx      # Main health dashboard
│   │   │   ├── RiskAnalysis.jsx   # AI risk prediction form
│   │   │   ├── ReportUpload.jsx   # Lab report analyzer
│   │   │   ├── MapView.jsx        # Hospital & outbreak map
│   │   │   ├── Alerts.jsx
│   │   │   └── Profile.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx         # Sidebar layout
│   │   ├── api.js                 # Axios API helpers
│   │   ├── AuthContext.jsx        # Auth state
│   │   └── App.jsx                # Router
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker-compose.yml
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- pip

---

### Step 1: Backend Setup

```bash
cd lifeset/backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
# Mac/Linux:
source venv/bin/activate

# Windows (Command Prompt):
venv\Scripts\activate

# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Windows (Git Bash):
source venv/Scripts/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

---

### Step 2: Frontend Setup

```bash
cd lifeset/frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🐳 Docker (Production)

```bash
cd lifeset
docker-compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:8000

---

## 🔑 Features

### ✅ User Auth
- Register / Login (token-based, localStorage)

### 🧠 AI Risk Prediction
- Rule-based weighted scoring
- Heart Disease, Diabetes, Stroke, Hypertension
- Factors: age, BMI, BP, glucose, cholesterol, lifestyle, family history

### 📄 Lab Report Analyzer
- Upload PDF or image blood reports
- Auto-detects 11+ blood parameters (glucose, HbA1c, cholesterol, hemoglobin, etc.)
- Flags abnormal values against reference ranges
- Provides preventive suggestions
- Falls back to demo data if OCR not installed

### 📊 Health Dashboard
- Risk score cards with animated bars
- Historical risk trend line chart
- BMI indicator
- Personalized recommendations (diet, exercise, lifestyle)

### 🗺️ Map View
- Hospital, clinic, pharmacy markers on Leaflet/OpenStreetMap
- Disease outbreak zones with severity circles
- Filterable by facility type

### 🔔 Alerts System
- Auto-generated for high risk scores
- Alerts for abnormal report values
- Mark read / mark all read

### 👤 Profile Page
- BMI calculation
- Full health stats overview
- Risk snapshot

---

## 🩺 OCR Setup (Optional)

For real lab report text extraction, install Tesseract:

**Ubuntu/Debian:**
```bash
sudo apt install tesseract-ocr
pip install pytesseract Pillow PyPDF2
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki

Without Tesseract, the analyzer uses built-in demo values to demonstrate the feature.

---

## 🔒 Security Notes

- Passwords are SHA-256 hashed
- Simple base64 token auth (upgrade to JWT for production)
- No sensitive data sent to external APIs
- All data stored locally in SQLite

---

## 📜 License

Built for hackathon / educational purposes. Not for clinical use.

---

## 🌐 Deployment (Free Hosting)

### Option 1: Render.com (Recommended - One Click)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/lifeset.git
   git push -u origin main
   ```

2. **Deploy to Render**
   - Go to [render.com](https://render.com) and sign up
   - Click **"New"** → **"Blueprint"**
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml` and deploy both services

3. **Set Environment Variables** (in Render Dashboard)
   - Go to your `lifeset-api` service → Environment
   - Add: `GROQ_API_KEY` = `your_groq_api_key`

4. **Update Frontend API URL**
   - Go to `lifeset-frontend` service → Environment
   - Add: `VITE_API_URL` = `https://lifeset-api.onrender.com`

### Option 2: Manual Deployment on Render

#### Backend:
1. New → Web Service → Connect GitHub
2. **Root Directory:** `backend`
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add env var: `GROQ_API_KEY`

#### Frontend:
1. New → Static Site → Connect GitHub
2. **Root Directory:** `frontend`
3. **Build Command:** `npm install && npm run build`
4. **Publish Directory:** `dist`
5. Add env var: `VITE_API_URL` = `https://your-backend.onrender.com`

### Option 3: Vercel (Frontend) + Render (Backend)

**Frontend on Vercel:**
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repo
3. Set root directory: `frontend`
4. Add env var: `VITE_API_URL` = `https://your-backend.onrender.com`

**Backend on Render:** Follow Option 2 Backend steps above.

---

### 🔗 After Deployment

Your app will be live at:
- **Frontend:** `https://lifeset-frontend.onrender.com`
- **Backend API:** `https://lifeset-api.onrender.com`
- **API Docs:** `https://lifeset-api.onrender.com/docs`
