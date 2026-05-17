from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from services.diet_plan_engine import generate_diet_plan, generate_exercise_plan

router = APIRouter()

# ── Exercise Video Database ──────────────────────────────────────────────────
# Using popular YouTube fitness channels with verified working video IDs
EXERCISE_VIDEOS = {
    "brisk_walking": {
        "title": "30 Min Fat Burning Walking Workout",
        "video_url": "https://www.youtube.com/embed/njeZ29umqVE",
        "thumbnail": "https://img.youtube.com/vi/njeZ29umqVE/hqdefault.jpg",
        "duration": "30 min",
        "calories": "150-200 kcal",
        "instructions": [
            "Stand tall with shoulders back",
            "Swing arms naturally at your sides",
            "Take quick, short steps",
            "Maintain pace where you can talk but not sing",
            "Keep core engaged throughout"
        ],
        "reps": "Continuous for 30 minutes"
    },
    "surya_namaskar": {
        "title": "Surya Namaskar (Sun Salutation) for Beginners",
        "video_url": "https://www.youtube.com/embed/AbPufvvYiSw",
        "thumbnail": "https://img.youtube.com/vi/AbPufvvYiSw/hqdefault.jpg",
        "duration": "15-20 min",
        "calories": "150-200 kcal",
        "instructions": [
            "Start in Pranamasana (Prayer pose)",
            "Flow through 12 poses in sequence",
            "Coordinate breath with movement",
            "Inhale during backward bends",
            "Exhale during forward bends"
        ],
        "reps": "5-10 rounds"
    },
    "yoga_beginners": {
        "title": "20 Min Yoga for Complete Beginners",
        "video_url": "https://www.youtube.com/embed/v7AYKMP6rOE",
        "thumbnail": "https://img.youtube.com/vi/v7AYKMP6rOE/hqdefault.jpg",
        "duration": "20 min",
        "calories": "80-100 kcal",
        "instructions": [
            "Start with deep breathing",
            "Move slowly and mindfully",
            "Never force a stretch",
            "Hold each pose for 5-10 breaths",
            "Rest in child's pose when needed"
        ],
        "reps": "Hold each pose 30-60 seconds"
    },
    "pranayama": {
        "title": "Pranayama Breathing for Beginners",
        "video_url": "https://www.youtube.com/embed/odADwWzHR24",
        "thumbnail": "https://img.youtube.com/vi/odADwWzHR24/hqdefault.jpg",
        "duration": "10-15 min",
        "calories": "20-30 kcal",
        "instructions": [
            "Sit in comfortable position",
            "Keep spine straight",
            "Close eyes and relax shoulders",
            "Focus on breath awareness",
            "Practice on empty stomach"
        ],
        "reps": "10-15 cycles each technique"
    },
    "strength_bodyweight": {
        "title": "Full Body Strength - No Equipment",
        "video_url": "https://www.youtube.com/embed/UItWltVZZmE",
        "thumbnail": "https://img.youtube.com/vi/UItWltVZZmE/hqdefault.jpg",
        "duration": "25-30 min",
        "calories": "150-200 kcal",
        "instructions": [
            "Warm up for 5 minutes first",
            "Perform exercises with proper form",
            "Rest 30-60 seconds between sets",
            "Breathe out during exertion",
            "Cool down and stretch after"
        ],
        "reps": "3 sets of 10-15 reps each exercise"
    },
    "hiit_workout": {
        "title": "20 Min HIIT Cardio Workout",
        "video_url": "https://www.youtube.com/embed/ml6cT4AZdqI",
        "thumbnail": "https://img.youtube.com/vi/ml6cT4AZdqI/hqdefault.jpg",
        "duration": "20 min",
        "calories": "250-350 kcal",
        "instructions": [
            "Work at maximum effort for 30-45 seconds",
            "Rest for 15-30 seconds",
            "Keep core tight throughout",
            "Modify exercises if needed",
            "Stay hydrated"
        ],
        "reps": "4-5 rounds of circuit"
    },
    "swimming_technique": {
        "title": "Swimming Basics for Beginners",
        "video_url": "https://www.youtube.com/embed/gh5mAtmeR3Y",
        "thumbnail": "https://img.youtube.com/vi/gh5mAtmeR3Y/hqdefault.jpg",
        "duration": "30-45 min",
        "calories": "200-400 kcal",
        "instructions": [
            "Warm up with easy laps",
            "Focus on breathing technique",
            "Alternate between strokes",
            "Use kickboard for leg workout",
            "Cool down with slow laps"
        ],
        "reps": "20-30 laps with rest intervals"
    },
    "cycling": {
        "title": "30 Min Indoor Cycling Workout",
        "video_url": "https://www.youtube.com/embed/quVCpkGLqOE",
        "thumbnail": "https://img.youtube.com/vi/quVCpkGLqOE/hqdefault.jpg",
        "duration": "30 min",
        "calories": "200-350 kcal",
        "instructions": [
            "Adjust seat to proper height",
            "Start with easy warm-up pace",
            "Maintain steady cadence (60-80 RPM)",
            "Include intervals for intensity",
            "Cool down with easy spinning"
        ],
        "reps": "Continuous with interval bursts"
    },
    "stretching": {
        "title": "15 Min Full Body Stretching",
        "video_url": "https://www.youtube.com/embed/g_tea8ZNk5A",
        "thumbnail": "https://img.youtube.com/vi/g_tea8ZNk5A/hqdefault.jpg",
        "duration": "15 min",
        "calories": "30-50 kcal",
        "instructions": [
            "Never bounce while stretching",
            "Hold each stretch 20-30 seconds",
            "Breathe deeply and relax",
            "Stretch both sides equally",
            "Stop if you feel pain"
        ],
        "reps": "Hold each stretch 20-30 seconds"
    },
    "core_workout": {
        "title": "10 Min Core & Abs Workout",
        "video_url": "https://www.youtube.com/embed/AnYl6Nk9GOA",
        "thumbnail": "https://img.youtube.com/vi/AnYl6Nk9GOA/hqdefault.jpg",
        "duration": "10 min",
        "calories": "80-120 kcal",
        "instructions": [
            "Engage core before each exercise",
            "Keep lower back pressed to floor",
            "Breathe steadily throughout",
            "Quality over quantity",
            "Rest when form breaks down"
        ],
        "reps": "3 sets of 15-20 reps"
    }
}

YOGA_VIDEOS = {
    "mandukasana": {
        "title": "Mandukasana (Frog Pose) for Diabetes",
        "video_url": "https://www.youtube.com/embed/Yzm3fA2HhkQ",
        "thumbnail": "https://img.youtube.com/vi/Yzm3fA2HhkQ/hqdefault.jpg",
        "duration": "3-5 min",
        "benefit": "Stimulates pancreas, helps with diabetes",
        "instructions": ["Sit in Vajrasana", "Make fists with thumbs inside", "Place fists on navel", "Exhale and bend forward", "Hold for 30-60 seconds"],
        "reps": "3-5 repetitions"
    },
    "dhanurasana": {
        "title": "Dhanurasana (Bow Pose)",
        "video_url": "https://www.youtube.com/embed/c6CgFt4onGk",
        "thumbnail": "https://img.youtube.com/vi/c6CgFt4onGk/hqdefault.jpg",
        "duration": "3-5 min",
        "benefit": "Massages abdominal organs, improves digestion",
        "instructions": ["Lie on stomach", "Bend knees and hold ankles", "Inhale and lift chest and thighs", "Look up and hold", "Release slowly"],
        "reps": "3-5 repetitions, hold 15-30 seconds"
    },
    "kapalbhati": {
        "title": "Kapalbhati Pranayama",
        "video_url": "https://www.youtube.com/embed/qfJ-_DaIRhc",
        "thumbnail": "https://img.youtube.com/vi/qfJ-_DaIRhc/hqdefault.jpg",
        "duration": "5-10 min",
        "benefit": "Improves metabolism, cleanses lungs",
        "instructions": ["Sit comfortably with spine straight", "Take a deep breath in", "Exhale forcefully through nose", "Let inhalation happen naturally", "Start with 30 strokes, increase gradually"],
        "reps": "3 rounds of 30-60 strokes"
    },
    "anulom_vilom": {
        "title": "Anulom Vilom (Alternate Nostril Breathing)",
        "video_url": "https://www.youtube.com/embed/8VwufJrUhic",
        "thumbnail": "https://img.youtube.com/vi/8VwufJrUhic/hqdefault.jpg",
        "duration": "5-10 min",
        "benefit": "Reduces blood pressure and stress",
        "instructions": ["Sit in comfortable position", "Close right nostril with thumb", "Inhale through left nostril (4 counts)", "Close left, open right, exhale (4 counts)", "Inhale right, exhale left - repeat"],
        "reps": "10-15 cycles"
    },
    "shavasana": {
        "title": "Shavasana (Corpse Pose) Relaxation",
        "video_url": "https://www.youtube.com/embed/SN4UHEfQJyk",
        "thumbnail": "https://img.youtube.com/vi/SN4UHEfQJyk/hqdefault.jpg",
        "duration": "5-10 min",
        "benefit": "Deep relaxation, lowers heart rate",
        "instructions": ["Lie flat on back", "Arms at sides, palms up", "Feet fall naturally apart", "Close eyes and relax every muscle", "Focus on breath"],
        "reps": "Hold for 5-10 minutes"
    },
    "bhramari": {
        "title": "Bhramari (Humming Bee Breath)",
        "video_url": "https://www.youtube.com/embed/uxayUBd6T7M",
        "thumbnail": "https://img.youtube.com/vi/uxayUBd6T7M/hqdefault.jpg",
        "duration": "5 min",
        "benefit": "Calms nervous system, reduces anxiety",
        "instructions": ["Sit comfortably", "Close ears with thumbs", "Place fingers over eyes", "Inhale deeply", "Exhale with humming sound"],
        "reps": "5-10 repetitions"
    },
    "tadasana": {
        "title": "Tadasana (Mountain Pose)",
        "video_url": "https://www.youtube.com/embed/2HTvZp5rPrg",
        "thumbnail": "https://img.youtube.com/vi/2HTvZp5rPrg/hqdefault.jpg",
        "duration": "2-3 min",
        "benefit": "Improves posture and balance",
        "instructions": ["Stand with feet together", "Distribute weight evenly", "Engage thighs and core", "Roll shoulders back", "Reach arms overhead"],
        "reps": "Hold for 30-60 seconds, repeat 3 times"
    },
    "trikonasana": {
        "title": "Trikonasana (Triangle Pose)",
        "video_url": "https://www.youtube.com/embed/upFYlxZHif0",
        "thumbnail": "https://img.youtube.com/vi/upFYlxZHif0/hqdefault.jpg",
        "duration": "3-5 min",
        "benefit": "Stretches and tones entire body",
        "instructions": ["Stand with feet wide apart", "Turn right foot out 90 degrees", "Extend arms parallel to floor", "Bend at hip toward right foot", "Look up at raised hand"],
        "reps": "Hold 30 seconds each side, 3 repetitions"
    },
    "vrikshasana": {
        "title": "Vrikshasana (Tree Pose)",
        "video_url": "https://www.youtube.com/embed/wdln9qWYloU",
        "thumbnail": "https://img.youtube.com/vi/wdln9qWYloU/hqdefault.jpg",
        "duration": "3-5 min",
        "benefit": "Improves balance and focus",
        "instructions": ["Stand on one leg", "Place other foot on inner thigh", "Bring hands to prayer position", "Fix gaze on one point", "Hold and breathe steadily"],
        "reps": "Hold 30-60 seconds each side"
    },
    "paschimottanasana": {
        "title": "Paschimottanasana (Seated Forward Bend)",
        "video_url": "https://www.youtube.com/embed/SqT9GtcGjQc",
        "thumbnail": "https://img.youtube.com/vi/SqT9GtcGjQc/hqdefault.jpg",
        "duration": "3-5 min",
        "benefit": "Stimulates digestion, calms mind",
        "instructions": ["Sit with legs extended", "Inhale and raise arms", "Exhale and fold forward", "Hold feet or ankles", "Keep spine long"],
        "reps": "Hold for 1-3 minutes"
    }
}


class CustomDietRequest(BaseModel):
    age: int
    weight: float
    height: float
    gender: str
    goal: str  # "lose", "gain", "maintain"
    activity_level: str  # "sedentary", "light", "moderate", "active", "very_active"
    diet_preference: str = "mixed"  # "vegetarian", "vegan", "mixed"
    health_conditions: List[str] = []


def calculate_health_score(profile: dict, risks: dict) -> dict:
    score = 100.0

    # Deduct for risks
    heart  = risks.get("heart", 0)
    diab   = risks.get("diabetes", 0)
    stroke = risks.get("stroke", 0)
    hypert = risks.get("hypertension", 0)
    bmi    = risks.get("bmi", 22)

    avg_risk = (heart + diab + stroke + hypert) / 4
    score -= avg_risk * 0.5  # Max -50 from risks

    # Lifestyle factors
    if profile.get("smoking"):   score -= 10
    if profile.get("alcohol"):   score -= 5
    freq = profile.get("exercise_freq", "never")
    if freq == "daily":      score += 5
    elif freq == "regularly": score += 3
    elif freq == "never":     score -= 8
    elif freq == "rarely":    score -= 5

    diet = profile.get("diet_type", "mixed")
    if diet in ["mediterranean", "vegan", "vegetarian"]: score += 3
    if diet in ["junk", "high-sugar", "high-salt"]:      score -= 8

    # BMI
    if 18.5 <= bmi < 25:  score += 5
    elif bmi >= 35:        score -= 12
    elif bmi >= 30:        score -= 8
    elif bmi < 18.5:       score -= 5

    # Clinical values bonus
    bp_sys = profile.get("blood_pressure_sys")
    glucose = profile.get("blood_glucose")
    if bp_sys and 90 <= bp_sys <= 120: score += 3
    if glucose and 70 <= glucose <= 100: score += 3

    score = max(0, min(100, round(score, 1)))

    if score >= 75:   color, label = "green",  "Excellent"
    elif score >= 55: color, label = "yellow", "Moderate"
    elif score >= 35: color, label = "orange", "At Risk"
    else:             color, label = "red",    "High Risk"

    tips = []
    if heart > 50:   tips.append("Prioritize cardio exercise and a heart-healthy diet")
    if diab > 50:    tips.append("Monitor blood glucose and reduce refined carbohydrate intake")
    if hypert > 50:  tips.append("Reduce sodium intake and manage stress actively")
    if profile.get("smoking"): tips.append("Quitting smoking will immediately improve your score")
    if freq in ["never","rarely"]: tips.append("Adding just 30 min of walking daily can boost your score by 8+ points")
    if not tips: tips.append("Keep up your healthy habits!")

    return {"score": score, "color": color, "label": label, "improvement_tips": tips}

@router.get("/health-score/{user_id}")
def get_health_score(user_id: int):
    conn = get_db()
    profile = conn.execute("SELECT * FROM health_profiles WHERE user_id=?", (user_id,)).fetchone()
    history = conn.execute(
        "SELECT * FROM risk_history WHERE user_id=? ORDER BY calculated_at DESC LIMIT 1", (user_id,)
    ).fetchone()
    conn.close()

    if not profile:
        return {"score": 0, "color": "gray", "label": "No Data", "improvement_tips": ["Complete your health profile to get a score"]}

    p = dict(profile)
    risks = dict(history) if history else {"heart": 0, "diabetes": 0, "stroke": 0, "hypertension": 0, "bmi": 22}
    # Map column names
    risks = {
        "heart": risks.get("heart_risk", 0),
        "diabetes": risks.get("diabetes_risk", 0),
        "stroke": risks.get("stroke_risk", 0),
        "hypertension": risks.get("hypertension_risk", 0),
        "bmi": p.get("weight", 70) / ((p.get("height", 170) / 100) ** 2) if p.get("height") else 22,
    }
    return calculate_health_score(p, risks)

@router.get("/diet-plan/{user_id}")
def get_diet_plan(user_id: int):
    conn = get_db()
    profile = conn.execute("SELECT * FROM health_profiles WHERE user_id=?", (user_id,)).fetchone()
    history = conn.execute(
        "SELECT * FROM risk_history WHERE user_id=? ORDER BY calculated_at DESC LIMIT 1", (user_id,)
    ).fetchone()
    report_rows = conn.execute(
        "SELECT analysis_result, abnormal_values FROM reports WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 5",
        (user_id,)
    ).fetchall()
    conn.close()

    p = dict(profile) if profile else {}
    risks = {}
    if history:
        h = dict(history)
        bmi = p.get("weight", 70) / ((p.get("height", 170) / 100) ** 2) if p.get("height") else 22
        risks = {
            "heart": h.get("heart_risk", 0),
            "diabetes": h.get("diabetes_risk", 0),
            "stroke": h.get("stroke_risk", 0),
            "hypertension": h.get("hypertension_risk", 0),
            "bmi": bmi,
        }

    import json
    reports = []
    for r in report_rows:
        try:    analysis = json.loads(r["analysis_result"] or "{}")
        except: analysis = {}
        try:    abnormal = json.loads(r["abnormal_values"] or "{}")
        except: abnormal = {}
        reports.append({"analysis": analysis, "abnormal": abnormal})

    return generate_diet_plan(p, risks, reports)

@router.get("/exercise-plan/{user_id}")
def get_exercise_plan(user_id: int):
    conn = get_db()
    profile = conn.execute("SELECT * FROM health_profiles WHERE user_id=?", (user_id,)).fetchone()
    history = conn.execute(
        "SELECT * FROM risk_history WHERE user_id=? ORDER BY calculated_at DESC LIMIT 1", (user_id,)
    ).fetchone()
    report_rows = conn.execute(
        "SELECT analysis_result, abnormal_values FROM reports WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 5",
        (user_id,)
    ).fetchall()
    conn.close()

    p = dict(profile) if profile else {}
    risks = {}
    if history:
        h = dict(history)
        bmi = p.get("weight", 70) / ((p.get("height", 170) / 100) ** 2) if p.get("height") else 22
        risks = {
            "heart": h.get("heart_risk", 0),
            "diabetes": h.get("diabetes_risk", 0),
            "stroke": h.get("stroke_risk", 0),
            "hypertension": h.get("hypertension_risk", 0),
            "bmi": bmi,
        }

    import json
    reports = []
    for r in report_rows:
        try:    analysis = json.loads(r["analysis_result"] or "{}")
        except: analysis = {}
        try:    abnormal = json.loads(r["abnormal_values"] or "{}")
        except: abnormal = {}
        reports.append({"analysis": analysis, "abnormal": abnormal})

    return generate_exercise_plan(p, risks, reports)


# ── Enhanced Exercise Plan with Videos ────────────────────────────────────────
@router.get("/exercise-videos")
def get_exercise_videos():
    """Return all available exercise videos"""
    return {"exercises": EXERCISE_VIDEOS, "yoga": YOGA_VIDEOS}


@router.get("/enhanced-exercise-plan/{user_id}")
def get_enhanced_exercise_plan(user_id: int):
    """Get exercise plan with video links and detailed instructions"""
    conn = get_db()
    profile = conn.execute("SELECT * FROM health_profiles WHERE user_id=?", (user_id,)).fetchone()
    history = conn.execute(
        "SELECT * FROM risk_history WHERE user_id=? ORDER BY calculated_at DESC LIMIT 1", (user_id,)
    ).fetchone()
    report_rows = conn.execute(
        "SELECT analysis_result, abnormal_values FROM reports WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 5",
        (user_id,)
    ).fetchall()
    conn.close()

    p = dict(profile) if profile else {}
    risks = {}
    if history:
        h = dict(history)
        bmi = p.get("weight", 70) / ((p.get("height", 170) / 100) ** 2) if p.get("height") else 22
        risks = {
            "heart": h.get("heart_risk", 0),
            "diabetes": h.get("diabetes_risk", 0),
            "stroke": h.get("stroke_risk", 0),
            "hypertension": h.get("hypertension_risk", 0),
            "bmi": bmi,
        }

    import json
    reports = []
    for r in report_rows:
        try:    analysis = json.loads(r["analysis_result"] or "{}")
        except: analysis = {}
        try:    abnormal = json.loads(r["abnormal_values"] or "{}")
        except: abnormal = {}
        reports.append({"analysis": analysis, "abnormal": abnormal})

    base_plan = generate_exercise_plan(p, risks, reports)
    
    # Map activities to videos
    activity_video_map = {
        "brisk walking": "brisk_walking",
        "walking": "brisk_walking",
        "yoga": "yoga_beginners",
        "gentle yoga": "yoga_beginners",
        "surya namaskar": "surya_namaskar",
        "pranayama": "pranayama",
        "strength": "strength_bodyweight",
        "bodyweight": "strength_bodyweight",
        "hiit": "hiit_workout",
        "running": "hiit_workout",
        "swimming": "swimming_technique",
        "cycling": "cycling",
        "stretching": "stretching",
        "core": "core_workout",
    }
    
    # Enhance weekly plan with videos
    enhanced_weekly = []
    for day in base_plan.get("weekly_plan", []):
        activity_lower = day["activity"].lower()
        video_key = None
        for keyword, key in activity_video_map.items():
            if keyword in activity_lower:
                video_key = key
                break
        
        video_info = EXERCISE_VIDEOS.get(video_key, EXERCISE_VIDEOS["brisk_walking"])
        enhanced_weekly.append({
            **day,
            "video": video_info,
            "video_key": video_key or "brisk_walking"
        })
    
    # Enhance yoga with videos
    enhanced_yoga = []
    yoga_name_map = {
        "mandukasana": "mandukasana",
        "frog": "mandukasana",
        "dhanurasana": "dhanurasana",
        "bow": "dhanurasana",
        "kapalbhati": "kapalbhati",
        "anulom vilom": "anulom_vilom",
        "alternate nostril": "anulom_vilom",
        "shavasana": "shavasana",
        "corpse": "shavasana",
        "bhramari": "bhramari",
        "humming": "bhramari",
        "tadasana": "tadasana",
        "mountain": "tadasana",
        "trikonasana": "trikonasana",
        "triangle": "trikonasana",
        "vrikshasana": "vrikshasana",
        "tree": "vrikshasana",
        "paschimottanasana": "paschimottanasana",
        "forward bend": "paschimottanasana",
        "surya namaskar": "surya_namaskar",
    }
    
    for yoga in base_plan.get("yoga", []):
        pose_lower = yoga["pose"].lower()
        video_key = None
        for keyword, key in yoga_name_map.items():
            if keyword in pose_lower:
                video_key = key
                break
        
        if video_key and video_key in YOGA_VIDEOS:
            video_info = YOGA_VIDEOS[video_key]
            enhanced_yoga.append({
                **yoga,
                "video": video_info,
                "video_key": video_key,
                "instructions": video_info.get("instructions", []),
                "reps": video_info.get("reps", "As comfortable")
            })
        else:
            enhanced_yoga.append({
                **yoga,
                "video": None,
                "instructions": ["Follow proper form", "Breathe steadily", "Don't force the pose"],
                "reps": "Hold for 30-60 seconds"
            })
    
    return {
        **base_plan,
        "weekly_plan": enhanced_weekly,
        "yoga": enhanced_yoga,
        "all_exercise_videos": EXERCISE_VIDEOS,
        "all_yoga_videos": YOGA_VIDEOS,
    }


# ── Custom Diet Planner ───────────────────────────────────────────────────────
@router.post("/custom-diet-plan")
def create_custom_diet_plan(req: CustomDietRequest):
    """Generate a custom diet plan based on user's weight goals"""
    
    # Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
    if req.gender.lower() in ["male", "m"]:
        bmr = 10 * req.weight + 6.25 * req.height - 5 * req.age + 5
    else:
        bmr = 10 * req.weight + 6.25 * req.height - 5 * req.age - 161
    
    # Activity multipliers
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    
    tdee = bmr * activity_multipliers.get(req.activity_level, 1.55)
    
    # Adjust calories based on goal
    if req.goal == "lose":
        target_calories = tdee - 500  # 0.5 kg/week loss
        protein_ratio = 0.30
        carb_ratio = 0.40
        fat_ratio = 0.30
        goal_text = "Weight Loss (0.5 kg/week)"
    elif req.goal == "gain":
        target_calories = tdee + 400  # Lean muscle gain
        protein_ratio = 0.30
        carb_ratio = 0.45
        fat_ratio = 0.25
        goal_text = "Muscle Gain (0.3-0.5 kg/week)"
    else:
        target_calories = tdee
        protein_ratio = 0.25
        carb_ratio = 0.50
        fat_ratio = 0.25
        goal_text = "Weight Maintenance"
    
    # Calculate macros
    protein_g = round((target_calories * protein_ratio) / 4)
    carbs_g = round((target_calories * carb_ratio) / 4)
    fat_g = round((target_calories * fat_ratio) / 9)
    
    # Calculate BMI
    bmi = req.weight / ((req.height / 100) ** 2)
    
    is_veg = req.diet_preference in ["vegetarian", "vegan"]
    
    # Generate meal plans based on goal
    if req.goal == "lose":
        breakfast = [
            "Oatmeal with berries and chia seeds (no sugar)" if is_veg else "2 egg whites + 1 whole egg scrambled with vegetables",
            "Greek yogurt with nuts and seeds (small portion)",
            "Vegetable smoothie with spinach, cucumber, and protein powder",
            "Moong dal chilla (2 pieces) with green chutney",
        ]
        lunch = [
            "Large salad with chickpeas, olive oil dressing, and vegetables",
            "Brown rice (½ cup) + dal + lots of vegetables",
            "Quinoa bowl with roasted vegetables and paneer/tofu",
            "2 multigrain rotis + sabzi + cucumber raita",
        ]
        dinner = [
            "Vegetable soup + 1 roti (no rice at night)",
            "Grilled paneer/tofu with stir-fried vegetables",
            "Dal soup with salad (light dinner)",
            "Steamed vegetables with small portion of dal",
        ]
        snacks = [
            "Green tea + 5 almonds",
            "Cucumber and carrot sticks",
            "1 small apple or pear",
            "Roasted chana (small handful)",
        ]
        if not is_veg:
            lunch.append("Grilled chicken breast (150g) + steamed vegetables + small rice")
            dinner.append("Baked fish with roasted vegetables")
    
    elif req.goal == "gain":
        breakfast = [
            "4 egg omelette with cheese and vegetables + 2 toast" if not is_veg else "Paneer paratha (2) + curd + banana shake",
            "Oatmeal with banana, peanut butter, honey, and milk",
            "Protein smoothie: banana, oats, milk, peanut butter, protein powder",
            "Poha with peanuts + glass of milk + banana",
        ]
        lunch = [
            "Rice (1.5 cups) + dal + paneer curry + salad + curd",
            "3 rotis + rajma/chole + vegetables + buttermilk",
            "Chicken biryani (large portion) + raita" if not is_veg else "Vegetable biryani + paneer + raita",
            "Pasta with vegetables and cheese + protein source",
        ]
        dinner = [
            "Rice + dal + sabzi + curd",
            "3 rotis + egg curry + vegetables" if not is_veg else "3 rotis + paneer curry + vegetables",
            "Khichdi with ghee + papad + pickle",
            "Chicken curry + rice + salad" if not is_veg else "Soya chunk curry + rice + salad",
        ]
        snacks = [
            "Banana shake with peanut butter",
            "Handful of mixed nuts and dried fruits",
            "Cheese sandwich or paneer roll",
            "Protein bar or homemade laddoo",
            "Boiled eggs (2)" if not is_veg else "Sprouts chaat with peanuts",
        ]
    
    else:  # maintain
        breakfast = [
            "2 eggs any style + 2 toast + fruit" if not is_veg else "Idli (3) + sambar + chutney",
            "Oatmeal with fruits and nuts",
            "Paratha + curd + fruit",
            "Poha/Upma with vegetables + tea/coffee",
        ]
        lunch = [
            "Rice + dal + sabzi + salad + curd",
            "2-3 rotis + curry + vegetables + buttermilk",
            "Mixed grain bowl with protein and vegetables",
            "Rajma/chole chawal + salad",
        ]
        dinner = [
            "2 rotis + dal + sabzi",
            "Light khichdi + curd + papad",
            "Vegetable pulao + raita",
            "Soup + bread + salad",
        ]
        snacks = [
            "Fruit of choice",
            "Handful of nuts",
            "Tea/coffee with biscuits",
            "Sprouts or chana chaat",
        ]
    
    # Foods to avoid based on goal
    avoid = ["Refined sugar and sweets", "Deep fried foods", "Packaged/processed snacks", "Sugary drinks"]
    if req.goal == "lose":
        avoid.extend(["White rice in large portions", "White bread and maida", "Fruit juices", "Late night eating", "Alcohol"])
    elif req.goal == "gain":
        avoid.extend(["Skipping meals", "Low-calorie foods only", "Excessive cardio without eating enough"])
    
    # Add condition-specific notes
    special_notes = []
    for condition in req.health_conditions:
        cond_lower = condition.lower()
        if "diabetes" in cond_lower:
            special_notes.append("🩸 Diabetes: Avoid refined carbs, eat low-GI foods, monitor blood sugar")
        if "cholesterol" in cond_lower or "heart" in cond_lower:
            special_notes.append("❤️ Heart health: Limit saturated fats, eat more fiber and omega-3")
        if "thyroid" in cond_lower:
            special_notes.append("🦋 Thyroid: Take medication on empty stomach, limit raw cruciferous vegetables")
        if "kidney" in cond_lower:
            special_notes.append("🫘 Kidney: Follow nephrologist's protein and potassium guidelines")
    
    # Exercise recommendations based on goal
    if req.goal == "lose":
        exercise_plan = {
            "cardio": {"type": "Brisk walking/jogging", "duration": "30-45 min", "frequency": "5-6 days/week", "video": EXERCISE_VIDEOS["brisk_walking"]},
            "strength": {"type": "Bodyweight exercises", "duration": "20-30 min", "frequency": "3 days/week", "video": EXERCISE_VIDEOS["strength_bodyweight"]},
            "hiit": {"type": "HIIT workout", "duration": "20 min", "frequency": "2-3 days/week", "video": EXERCISE_VIDEOS["hiit_workout"]},
            "yoga": {"type": "Yoga for flexibility", "duration": "20 min", "frequency": "2-3 days/week", "video": EXERCISE_VIDEOS["yoga_beginners"]},
            "daily_steps": "10,000-12,000 steps",
            "calories_to_burn": "300-500 kcal/day through exercise"
        }
    elif req.goal == "gain":
        exercise_plan = {
            "strength": {"type": "Weight/resistance training", "duration": "45-60 min", "frequency": "4-5 days/week", "video": EXERCISE_VIDEOS["strength_bodyweight"]},
            "cardio": {"type": "Light cardio (don't overdo)", "duration": "15-20 min", "frequency": "2-3 days/week", "video": EXERCISE_VIDEOS["brisk_walking"]},
            "rest": {"type": "Rest and recovery", "duration": "Full day", "frequency": "2 days/week", "video": None},
            "yoga": {"type": "Stretching and mobility", "duration": "15 min", "frequency": "Daily", "video": EXERCISE_VIDEOS["stretching"]},
            "daily_steps": "6,000-8,000 steps",
            "focus": "Progressive overload in strength training"
        }
    else:
        exercise_plan = {
            "cardio": {"type": "Walking/cycling/swimming", "duration": "30 min", "frequency": "4-5 days/week", "video": EXERCISE_VIDEOS["brisk_walking"]},
            "strength": {"type": "Bodyweight or light weights", "duration": "25-30 min", "frequency": "2-3 days/week", "video": EXERCISE_VIDEOS["strength_bodyweight"]},
            "yoga": {"type": "Yoga and stretching", "duration": "20-30 min", "frequency": "2-3 days/week", "video": EXERCISE_VIDEOS["yoga_beginners"]},
            "daily_steps": "8,000-10,000 steps",
            "focus": "Consistency and enjoyment"
        }
    
    return {
        "goal": goal_text,
        "user_stats": {
            "age": req.age,
            "weight": req.weight,
            "height": req.height,
            "bmi": round(bmi, 1),
            "bmi_category": "Underweight" if bmi < 18.5 else "Normal" if bmi < 25 else "Overweight" if bmi < 30 else "Obese",
            "bmr": round(bmr),
            "tdee": round(tdee),
        },
        "nutrition": {
            "target_calories": round(target_calories),
            "protein_g": protein_g,
            "carbs_g": carbs_g,
            "fat_g": fat_g,
            "protein_percent": round(protein_ratio * 100),
            "carbs_percent": round(carb_ratio * 100),
            "fat_percent": round(fat_ratio * 100),
        },
        "meal_plan": {
            "breakfast": breakfast,
            "lunch": lunch,
            "dinner": dinner,
            "snacks": snacks,
        },
        "avoid": avoid,
        "hydration": f"Drink {3 if req.goal == 'lose' else 2.5}-{4 if req.goal == 'lose' else 3} liters of water daily",
        "special_notes": special_notes,
        "exercise_plan": exercise_plan,
        "weekly_schedule": generate_weekly_exercise_schedule(req.goal, req.activity_level),
        "tips": [
            "Track your food intake for better awareness" if req.goal == "lose" else "Eat every 3-4 hours to maintain energy" if req.goal == "gain" else "Listen to your body's hunger cues",
            "Weigh yourself weekly at the same time for accurate tracking",
            "Get 7-8 hours of quality sleep for optimal results",
            "Stay consistent — results take time!",
            "⚠️ Consult a dietitian for personalized medical advice",
        ]
    }


def generate_weekly_exercise_schedule(goal: str, activity_level: str) -> list:
    """Generate a weekly exercise schedule based on goal"""
    
    if goal == "lose":
        return [
            {"day": "Monday", "activity": "Brisk Walking + Core", "duration": "40 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["brisk_walking"], "reps": "Walk 30 min + 10 min core exercises"},
            {"day": "Tuesday", "activity": "HIIT Workout", "duration": "25 min", "intensity": "High", "video": EXERCISE_VIDEOS["hiit_workout"], "reps": "4 rounds of circuit"},
            {"day": "Wednesday", "activity": "Yoga + Stretching", "duration": "30 min", "intensity": "Light", "video": EXERCISE_VIDEOS["yoga_beginners"], "reps": "Hold each pose 30-60 sec"},
            {"day": "Thursday", "activity": "Strength Training", "duration": "35 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["strength_bodyweight"], "reps": "3 sets of 12-15 reps"},
            {"day": "Friday", "activity": "Cardio (Cycling/Swimming)", "duration": "40 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["cycling"], "reps": "Continuous with intervals"},
            {"day": "Saturday", "activity": "Long Walk or Hike", "duration": "60 min", "intensity": "Light", "video": EXERCISE_VIDEOS["brisk_walking"], "reps": "Continuous steady pace"},
            {"day": "Sunday", "activity": "Rest + Light Stretching", "duration": "15 min", "intensity": "Very Light", "video": EXERCISE_VIDEOS["stretching"], "reps": "Gentle stretches only"},
        ]
    elif goal == "gain":
        return [
            {"day": "Monday", "activity": "Upper Body Strength", "duration": "45 min", "intensity": "High", "video": EXERCISE_VIDEOS["strength_bodyweight"], "reps": "4 sets of 8-12 reps"},
            {"day": "Tuesday", "activity": "Lower Body Strength", "duration": "45 min", "intensity": "High", "video": EXERCISE_VIDEOS["strength_bodyweight"], "reps": "4 sets of 8-12 reps"},
            {"day": "Wednesday", "activity": "Rest + Light Yoga", "duration": "20 min", "intensity": "Very Light", "video": EXERCISE_VIDEOS["stretching"], "reps": "Recovery stretches"},
            {"day": "Thursday", "activity": "Push Exercises", "duration": "45 min", "intensity": "High", "video": EXERCISE_VIDEOS["strength_bodyweight"], "reps": "4 sets of 8-12 reps"},
            {"day": "Friday", "activity": "Pull Exercises", "duration": "45 min", "intensity": "High", "video": EXERCISE_VIDEOS["strength_bodyweight"], "reps": "4 sets of 8-12 reps"},
            {"day": "Saturday", "activity": "Full Body + Light Cardio", "duration": "50 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["strength_bodyweight"], "reps": "3 sets of 10-12 reps + 15 min walk"},
            {"day": "Sunday", "activity": "Complete Rest", "duration": "0 min", "intensity": "Rest", "video": None, "reps": "Recovery day - eat well, sleep well"},
        ]
    else:  # maintain
        return [
            {"day": "Monday", "activity": "Cardio (Walking/Cycling)", "duration": "30 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["brisk_walking"], "reps": "Continuous steady pace"},
            {"day": "Tuesday", "activity": "Strength Training", "duration": "30 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["strength_bodyweight"], "reps": "3 sets of 12 reps"},
            {"day": "Wednesday", "activity": "Yoga", "duration": "30 min", "intensity": "Light", "video": EXERCISE_VIDEOS["yoga_beginners"], "reps": "Full yoga session"},
            {"day": "Thursday", "activity": "Cardio", "duration": "30 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["cycling"], "reps": "Continuous with intervals"},
            {"day": "Friday", "activity": "Strength + Core", "duration": "35 min", "intensity": "Moderate", "video": EXERCISE_VIDEOS["core_workout"], "reps": "3 sets of 12-15 reps"},
            {"day": "Saturday", "activity": "Active Recreation", "duration": "45 min", "intensity": "Light", "video": EXERCISE_VIDEOS["brisk_walking"], "reps": "Sports, hiking, or swimming"},
            {"day": "Sunday", "activity": "Rest or Light Walk", "duration": "20 min", "intensity": "Very Light", "video": EXERCISE_VIDEOS["stretching"], "reps": "Gentle activity only"},
        ]


# ── Period Care Section ───────────────────────────────────────────────────────
# Period Care Videos - Working YouTube Videos
PERIOD_CARE_VIDEOS = {
    "yoga_cramps": {
        "title": "Yoga for Menstrual Cramps Relief",
        "video_url": "https://www.youtube.com/embed/2X78NWuRfJU",
        "thumbnail": "https://img.youtube.com/vi/2X78NWuRfJU/hqdefault.jpg",
        "duration": "15 min",
        "benefit": "Relieves cramps and lower back pain",
        "instructions": [
            "Start with child's pose for 2 minutes",
            "Move to cat-cow stretches",
            "Practice reclined bound angle pose",
            "End with legs up the wall pose",
            "Breathe deeply throughout"
        ],
        "reps": "Hold each pose 1-2 minutes"
    },
    "gentle_stretches": {
        "title": "Gentle Stretches for Period Pain",
        "video_url": "https://www.youtube.com/embed/t1hoOwbfgME",
        "thumbnail": "https://img.youtube.com/vi/t1hoOwbfgME/hqdefault.jpg",
        "duration": "10 min",
        "benefit": "Eases tension and discomfort",
        "instructions": [
            "Lie on your back with knees bent",
            "Gently rock knees side to side",
            "Hug knees to chest",
            "Stretch hip flexors gently",
            "Finish with deep breathing"
        ],
        "reps": "5-10 repetitions each"
    },
    "lower_back_relief": {
        "title": "Lower Back Pain Relief for Periods",
        "video_url": "https://www.youtube.com/embed/XeXz8fIZDCE",
        "thumbnail": "https://img.youtube.com/vi/XeXz8fIZDCE/hqdefault.jpg",
        "duration": "12 min",
        "benefit": "Targets lower back tension",
        "instructions": [
            "Start with pelvic tilts",
            "Practice knee-to-chest stretches",
            "Do gentle spinal twists",
            "Try supported bridge pose",
            "End with relaxation"
        ],
        "reps": "Hold stretches 30-60 seconds"
    },
    "walking_light": {
        "title": "Light Walking for Period Days",
        "video_url": "https://www.youtube.com/embed/njeZ29umqVE",
        "thumbnail": "https://img.youtube.com/vi/njeZ29umqVE/hqdefault.jpg",
        "duration": "15-20 min",
        "benefit": "Improves blood flow and mood",
        "instructions": [
            "Walk at a comfortable pace",
            "Keep movements gentle",
            "Stay hydrated",
            "Listen to your body",
            "Stop if you feel dizzy"
        ],
        "reps": "15-20 minutes continuous"
    },
    "breathing_relaxation": {
        "title": "Breathing Exercises for Period Relaxation",
        "video_url": "https://www.youtube.com/embed/tybOi4hjZFQ",
        "thumbnail": "https://img.youtube.com/vi/tybOi4hjZFQ/hqdefault.jpg",
        "duration": "10 min",
        "benefit": "Reduces stress and pain perception",
        "instructions": [
            "Sit or lie comfortably",
            "Practice deep belly breathing",
            "Try 4-7-8 breathing technique",
            "Focus on relaxing your abdomen",
            "Continue for 10 minutes"
        ],
        "reps": "10-15 breath cycles"
    },
    "hip_opener": {
        "title": "Hip Opening Yoga for Periods",
        "video_url": "https://www.youtube.com/embed/Ho9em79_0qg",
        "thumbnail": "https://img.youtube.com/vi/Ho9em79_0qg/hqdefault.jpg",
        "duration": "15 min",
        "benefit": "Releases hip tension and cramps",
        "instructions": [
            "Start with butterfly pose",
            "Move to pigeon pose (modified)",
            "Practice happy baby pose",
            "Try reclined goddess pose",
            "End with savasana"
        ],
        "reps": "Hold each pose 1-3 minutes"
    }
}

@router.get("/period-care")
def get_period_care():
    """Get comprehensive period care information including diet, exercises, and remedies"""
    
    return {
        "title": "Period Care & Wellness",
        "description": "Comprehensive guide for managing menstrual health with diet, exercises, and natural remedies",
        
        "diet_plan": {
            "title": "Period-Friendly Diet Plan",
            "description": "Foods that help reduce cramps, bloating, and mood swings",
            "foods_to_eat": [
                {
                    "category": "Iron-Rich Foods",
                    "emoji": "🥬",
                    "items": ["Spinach", "Lentils (Dal)", "Beetroot", "Pomegranate", "Dates", "Jaggery"],
                    "reason": "Replenishes iron lost during menstruation"
                },
                {
                    "category": "Anti-Inflammatory Foods",
                    "emoji": "🍊",
                    "items": ["Turmeric milk", "Ginger tea", "Fatty fish (salmon)", "Walnuts", "Flaxseeds"],
                    "reason": "Reduces inflammation and cramps"
                },
                {
                    "category": "Magnesium-Rich Foods",
                    "emoji": "🍌",
                    "items": ["Bananas", "Dark chocolate", "Almonds", "Avocado", "Pumpkin seeds"],
                    "reason": "Relaxes muscles and reduces cramps"
                },
                {
                    "category": "Hydrating Foods",
                    "emoji": "🥒",
                    "items": ["Cucumber", "Watermelon", "Coconut water", "Herbal teas", "Soups"],
                    "reason": "Reduces bloating and keeps you hydrated"
                },
                {
                    "category": "Calcium-Rich Foods",
                    "emoji": "🥛",
                    "items": ["Yogurt/Curd", "Milk", "Paneer", "Ragi", "Sesame seeds"],
                    "reason": "Helps reduce PMS symptoms"
                },
                {
                    "category": "Complex Carbohydrates",
                    "emoji": "🍚",
                    "items": ["Brown rice", "Oats", "Whole wheat", "Sweet potato", "Quinoa"],
                    "reason": "Stabilizes blood sugar and mood"
                }
            ],
            "foods_to_avoid": [
                {"item": "Caffeine (excess)", "reason": "Can worsen cramps and anxiety"},
                {"item": "Salty/processed foods", "reason": "Increases bloating and water retention"},
                {"item": "Sugary foods", "reason": "Causes energy crashes and mood swings"},
                {"item": "Fried/oily foods", "reason": "Can increase inflammation"},
                {"item": "Alcohol", "reason": "Dehydrates and worsens cramps"},
                {"item": "Red meat (excess)", "reason": "May increase prostaglandins causing cramps"}
            ],
            "sample_meals": {
                "breakfast": [
                    "Oatmeal with banana, dates, and almonds",
                    "Ragi porridge with jaggery and milk",
                    "Smoothie with spinach, banana, and flaxseeds",
                    "Whole wheat toast with avocado"
                ],
                "lunch": [
                    "Brown rice + dal + palak sabzi + curd",
                    "Quinoa bowl with roasted vegetables",
                    "Roti + rajma + cucumber raita",
                    "Khichdi with ghee and vegetables"
                ],
                "dinner": [
                    "Light soup with whole grain bread",
                    "Vegetable stew with rice",
                    "Moong dal khichdi",
                    "Grilled fish with steamed vegetables"
                ],
                "snacks": [
                    "Dark chocolate (small piece)",
                    "Handful of mixed nuts",
                    "Banana with peanut butter",
                    "Warm turmeric milk"
                ]
            }
        },
        
        "exercises": {
            "title": "Gentle Exercises for Period Days",
            "description": "Low-intensity exercises that help relieve cramps and improve mood",
            "important_note": "Listen to your body. If you feel too tired or in pain, rest is perfectly okay!",
            "recommended": [
                {
                    "name": "Yoga for Cramps",
                    "duration": "15-20 min",
                    "intensity": "Very Light",
                    "video": PERIOD_CARE_VIDEOS["yoga_cramps"],
                    "benefits": ["Relieves cramps", "Reduces lower back pain", "Calms the mind"]
                },
                {
                    "name": "Gentle Stretching",
                    "duration": "10-15 min",
                    "intensity": "Very Light",
                    "video": PERIOD_CARE_VIDEOS["gentle_stretches"],
                    "benefits": ["Eases muscle tension", "Improves flexibility", "Reduces stiffness"]
                },
                {
                    "name": "Light Walking",
                    "duration": "15-20 min",
                    "intensity": "Light",
                    "video": PERIOD_CARE_VIDEOS["walking_light"],
                    "benefits": ["Boosts endorphins", "Improves circulation", "Reduces bloating"]
                },
                {
                    "name": "Deep Breathing",
                    "duration": "10 min",
                    "intensity": "Very Light",
                    "video": PERIOD_CARE_VIDEOS["breathing_relaxation"],
                    "benefits": ["Reduces stress", "Lowers pain perception", "Promotes relaxation"]
                },
                {
                    "name": "Hip Opening Yoga",
                    "duration": "15 min",
                    "intensity": "Light",
                    "video": PERIOD_CARE_VIDEOS["hip_opener"],
                    "benefits": ["Releases hip tension", "Eases cramps", "Improves comfort"]
                },
                {
                    "name": "Lower Back Relief",
                    "duration": "12 min",
                    "intensity": "Very Light",
                    "video": PERIOD_CARE_VIDEOS["lower_back_relief"],
                    "benefits": ["Targets back pain", "Relaxes muscles", "Improves posture"]
                }
            ],
            "exercises_to_avoid": [
                "High-intensity workouts (HIIT)",
                "Heavy weight lifting",
                "Inverted yoga poses (headstand, shoulder stand)",
                "Intense ab exercises",
                "Long-distance running"
            ]
        },
        
        "pain_relief": {
            "title": "Natural Pain Relief Methods",
            "description": "Home remedies and techniques to ease period pain",
            "methods": [
                {
                    "name": "Heat Therapy",
                    "emoji": "🔥",
                    "how": "Apply a hot water bottle or heating pad to your lower abdomen for 15-20 minutes",
                    "why": "Heat relaxes the uterine muscles and increases blood flow, reducing cramps"
                },
                {
                    "name": "Ginger Tea",
                    "emoji": "🫚",
                    "how": "Boil fresh ginger in water for 10 minutes, add honey and drink 2-3 times daily",
                    "why": "Ginger has anti-inflammatory properties that reduce prostaglandins"
                },
                {
                    "name": "Turmeric Milk (Haldi Doodh)",
                    "emoji": "🥛",
                    "how": "Add 1/2 tsp turmeric to warm milk, drink before bed",
                    "why": "Curcumin in turmeric is a natural anti-inflammatory"
                },
                {
                    "name": "Massage with Essential Oils",
                    "emoji": "💆",
                    "how": "Mix lavender or clary sage oil with coconut oil, massage lower abdomen in circular motions",
                    "why": "Improves blood circulation and relaxes muscles"
                },
                {
                    "name": "Acupressure Points",
                    "emoji": "👆",
                    "how": "Press the point 4 finger-widths below your kneecap on the inner leg for 2-3 minutes",
                    "why": "This point (Spleen 6) is known to relieve menstrual pain"
                },
                {
                    "name": "Warm Bath",
                    "emoji": "🛁",
                    "how": "Take a warm bath with Epsom salts for 20 minutes",
                    "why": "Relaxes muscles and reduces overall tension"
                },
                {
                    "name": "Chamomile Tea",
                    "emoji": "🍵",
                    "how": "Steep chamomile tea bag in hot water for 5 minutes, drink 2-3 cups daily",
                    "why": "Has antispasmodic properties that reduce cramps"
                },
                {
                    "name": "Fennel Seeds (Saunf)",
                    "emoji": "🌿",
                    "how": "Chew 1 tsp fennel seeds or make tea by boiling in water",
                    "why": "Reduces uterine contractions and bloating"
                }
            ]
        },
        
        "medicine_suggestions": {
            "title": "Medicine Suggestions",
            "important_warning": "⚠️ IMPORTANT: Always consult a doctor before taking any medication. These are general suggestions only and may not be suitable for everyone. Self-medication can be harmful.",
            "consult_doctor_if": [
                "Pain is severe and doesn't improve with home remedies",
                "You have heavy bleeding (soaking through a pad/tampon every hour)",
                "Periods are irregular or very painful",
                "You have other symptoms like fever or unusual discharge",
                "You're considering starting any new medication"
            ],
            "common_otc_options": [
                {
                    "name": "Ibuprofen (Brufen, Advil)",
                    "type": "NSAID - Pain reliever",
                    "how_it_helps": "Reduces prostaglandins that cause cramps",
                    "note": "Take with food. Not for those with stomach issues or aspirin allergy.",
                    "doctor_approval": "Recommended to confirm with doctor"
                },
                {
                    "name": "Mefenamic Acid (Meftal Spas)",
                    "type": "NSAID + Antispasmodic",
                    "how_it_helps": "Reduces pain and uterine spasms",
                    "note": "Common in India for period pain. Take after food.",
                    "doctor_approval": "Consult doctor before use"
                },
                {
                    "name": "Paracetamol (Crocin, Dolo)",
                    "type": "Pain reliever",
                    "how_it_helps": "Mild pain relief, safer option",
                    "note": "Gentler on stomach but may be less effective for cramps",
                    "doctor_approval": "Generally safe, but confirm dosage with doctor"
                },
                {
                    "name": "Antispasmodics (Buscopan, Cyclopam)",
                    "type": "Muscle relaxant",
                    "how_it_helps": "Relaxes uterine muscles to reduce cramping",
                    "note": "May cause drowsiness",
                    "doctor_approval": "Consult doctor before use"
                }
            ],
            "supplements": [
                {
                    "name": "Magnesium",
                    "dosage": "200-400mg daily",
                    "benefit": "Reduces cramps and PMS symptoms"
                },
                {
                    "name": "Vitamin B6",
                    "dosage": "50-100mg daily",
                    "benefit": "Helps with mood swings and bloating"
                },
                {
                    "name": "Omega-3 Fish Oil",
                    "dosage": "1000-2000mg daily",
                    "benefit": "Anti-inflammatory, reduces cramp severity"
                },
                {
                    "name": "Iron supplement",
                    "dosage": "As prescribed",
                    "benefit": "Prevents anemia from blood loss"
                }
            ],
            "when_to_see_doctor_urgently": [
                "Extremely heavy bleeding",
                "Severe pain not relieved by medication",
                "Fever during periods",
                "Periods lasting more than 7 days",
                "Bleeding between periods",
                "Sudden change in period pattern"
            ]
        },
        
        "self_care_tips": {
            "title": "Self-Care During Periods",
            "tips": [
                {"tip": "Get enough sleep (7-9 hours)", "emoji": "😴"},
                {"tip": "Stay hydrated - drink 8-10 glasses of water", "emoji": "💧"},
                {"tip": "Use a period tracking app to predict your cycle", "emoji": "📱"},
                {"tip": "Wear comfortable, loose clothing", "emoji": "👗"},
                {"tip": "Take breaks and rest when needed", "emoji": "🛋️"},
                {"tip": "Practice stress-relief techniques", "emoji": "🧘"},
                {"tip": "Keep a heating pad handy", "emoji": "🔥"},
                {"tip": "Maintain good hygiene - change pads/tampons regularly", "emoji": "🩹"},
                {"tip": "Talk to someone if you're feeling low", "emoji": "💬"},
                {"tip": "Be kind to yourself - it's okay to slow down", "emoji": "💚"}
            ]
        },
        
        "all_videos": PERIOD_CARE_VIDEOS
    }
