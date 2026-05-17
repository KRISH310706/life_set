from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from services.prediction_engine import calculate_risks
from services.recommendation_engine import get_recommendations
import json

router = APIRouter()

class HealthProfile(BaseModel):
    user_id: int
    age: Optional[int] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    smoking: Optional[int] = 0
    alcohol: Optional[int] = 0
    exercise_freq: Optional[str] = "never"
    diet_type: Optional[str] = "mixed"
    medical_history: Optional[str] = ""
    symptoms: Optional[str] = ""
    blood_pressure_sys: Optional[int] = None
    blood_pressure_dia: Optional[int] = None
    blood_glucose: Optional[float] = None
    cholesterol: Optional[float] = None
    family_history: Optional[str] = ""

@router.get("/profile/{user_id}")
def get_profile(user_id: int):
    conn = get_db()
    profile = conn.execute(
        "SELECT * FROM health_profiles WHERE user_id=?", (user_id,)
    ).fetchone()
    conn.close()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return dict(profile)

@router.post("/profile")
def update_profile(profile: HealthProfile):
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        INSERT INTO health_profiles 
        (user_id, age, gender, weight, height, smoking, alcohol, exercise_freq,
         diet_type, medical_history, symptoms, blood_pressure_sys, blood_pressure_dia,
         blood_glucose, cholesterol, family_history, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
        age=excluded.age, gender=excluded.gender, weight=excluded.weight,
        height=excluded.height, smoking=excluded.smoking, alcohol=excluded.alcohol,
        exercise_freq=excluded.exercise_freq, diet_type=excluded.diet_type,
        medical_history=excluded.medical_history, symptoms=excluded.symptoms,
        blood_pressure_sys=excluded.blood_pressure_sys, blood_pressure_dia=excluded.blood_pressure_dia,
        blood_glucose=excluded.blood_glucose, cholesterol=excluded.cholesterol,
        family_history=excluded.family_history, updated_at=CURRENT_TIMESTAMP
    """, (
        profile.user_id, profile.age, profile.gender, profile.weight, profile.height,
        profile.smoking, profile.alcohol, profile.exercise_freq, profile.diet_type,
        profile.medical_history, profile.symptoms, profile.blood_pressure_sys,
        profile.blood_pressure_dia, profile.blood_glucose, profile.cholesterol,
        profile.family_history
    ))
    conn.commit()
    conn.close()
    return {"message": "Profile updated successfully"}

@router.get("/risks/{user_id}")
def get_risks(user_id: int):
    conn = get_db()
    profile = conn.execute(
        "SELECT * FROM health_profiles WHERE user_id=?", (user_id,)
    ).fetchone()
    conn.close()
    if not profile:
        raise HTTPException(404, "Profile not found")

    profile_dict = dict(profile)
    risks = calculate_risks(profile_dict)

    # Store risk history
    conn = get_db()
    conn.execute("""
        INSERT INTO risk_history (user_id, heart_risk, diabetes_risk, stroke_risk, hypertension_risk)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, risks["heart"], risks["diabetes"], risks["stroke"], risks["hypertension"]))

    # Generate alerts for high risks
    for risk_name, risk_val in risks.items():
        if risk_val >= 60:
            conn.execute("""
                INSERT INTO alerts (user_id, alert_type, message, severity)
                VALUES (?, ?, ?, ?)
            """, (user_id, "high_risk",
                  f"High {risk_name.capitalize()} Risk detected ({risk_val:.0f}%). Please consult a doctor.",
                  "danger"))
    conn.commit()
    conn.close()

    recommendations = get_recommendations(profile_dict, risks)
    return {"risks": risks, "recommendations": recommendations}

@router.get("/history/{user_id}")
def get_risk_history(user_id: int):
    conn = get_db()
    history = conn.execute(
        "SELECT * FROM risk_history WHERE user_id=? ORDER BY calculated_at DESC LIMIT 10",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(h) for h in history]
