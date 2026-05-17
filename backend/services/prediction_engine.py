"""
LifeSet Prediction Engine
Rule-based + weighted scoring for disease risk prediction.
OUTPUT: Risk percentages (0-100) for heart, diabetes, stroke, hypertension.
DISCLAIMER: For screening purposes only. Not a medical diagnosis.
"""

def clamp(val, lo=0, hi=100):
    return max(lo, min(hi, val))

def calculate_risks(profile: dict) -> dict:
    age = profile.get("age") or 30
    gender = (profile.get("gender") or "").lower()
    smoking = int(profile.get("smoking") or 0)
    alcohol = int(profile.get("alcohol") or 0)
    exercise = profile.get("exercise_freq") or "never"
    diet = profile.get("diet_type") or "mixed"
    bp_sys = profile.get("blood_pressure_sys") or 120
    bp_dia = profile.get("blood_pressure_dia") or 80
    glucose = profile.get("blood_glucose") or 90
    chol = profile.get("cholesterol") or 180
    weight = profile.get("weight") or 70
    height = profile.get("height") or 170
    medical_history = (profile.get("medical_history") or "").lower()
    symptoms = (profile.get("symptoms") or "").lower()
    family_history = (profile.get("family_history") or "").lower()

    bmi = weight / ((height / 100) ** 2) if height > 0 else 25

    # === HEART DISEASE RISK ===
    heart = 5.0
    heart += min(age * 0.4, 25)
    if gender == "male": heart += 5
    if smoking: heart += 15
    if alcohol: heart += 5
    if bp_sys > 140: heart += 15
    elif bp_sys > 130: heart += 8
    if chol > 240: heart += 15
    elif chol > 200: heart += 7
    if bmi > 30: heart += 10
    elif bmi > 25: heart += 5
    if exercise in ["never", "rarely"]: heart += 8
    elif exercise == "sometimes": heart += 3
    if "heart" in medical_history or "cardiac" in medical_history: heart += 20
    if "heart" in family_history: heart += 12
    if any(s in symptoms for s in ["chest pain", "shortness of breath", "palpitation"]): heart += 15

    # === DIABETES RISK ===
    diabetes = 5.0
    diabetes += min(age * 0.3, 20)
    if glucose > 126: diabetes += 30
    elif glucose > 100: diabetes += 15
    if bmi > 30: diabetes += 15
    elif bmi > 25: diabetes += 7
    if exercise in ["never", "rarely"]: diabetes += 10
    if diet in ["high-sugar", "junk"]: diabetes += 12
    if "diabetes" in medical_history: diabetes += 25
    if "diabetes" in family_history: diabetes += 15
    if smoking: diabetes += 8
    if any(s in symptoms for s in ["frequent urination", "thirst", "fatigue", "blurry vision"]): diabetes += 15

    # === STROKE RISK ===
    stroke = 3.0
    stroke += min(age * 0.35, 22)
    if bp_sys > 160: stroke += 20
    elif bp_sys > 140: stroke += 12
    if smoking: stroke += 12
    if alcohol: stroke += 8
    if "stroke" in medical_history or "tia" in medical_history: stroke += 25
    if "stroke" in family_history: stroke += 12
    if chol > 240: stroke += 10
    if atrial_fib := "atrial" in medical_history: stroke += 15
    if any(s in symptoms for s in ["headache", "dizziness", "numbness", "vision"]): stroke += 10

    # === HYPERTENSION RISK ===
    hypertension = 5.0
    hypertension += min(age * 0.35, 20)
    if bp_sys > 140: hypertension += 30
    elif bp_sys > 130: hypertension += 15
    if bp_dia > 90: hypertension += 15
    if smoking: hypertension += 10
    if alcohol: hypertension += 10
    if bmi > 30: hypertension += 12
    if exercise in ["never", "rarely"]: hypertension += 8
    if "hypertension" in medical_history or "blood pressure" in medical_history: hypertension += 20
    if "hypertension" in family_history: hypertension += 12
    if diet in ["high-salt", "junk"]: hypertension += 8

    return {
        "heart": round(clamp(heart), 1),
        "diabetes": round(clamp(diabetes), 1),
        "stroke": round(clamp(stroke), 1),
        "hypertension": round(clamp(hypertension), 1),
        "bmi": round(bmi, 1),
    }
