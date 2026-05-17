"""
LifeSet Recommendation Engine
Generates personalized health recommendations based on risk profile.
"""

def get_recommendations(profile: dict, risks: dict) -> dict:
    recs = {
        "diet": [],
        "exercise": [],
        "lifestyle": [],
        "preventive_care": [],
        "doctor_consultation": []
    }

    smoking = int(profile.get("smoking") or 0)
    alcohol = int(profile.get("alcohol") or 0)
    bmi = risks.get("bmi", 25)
    heart = risks.get("heart", 0)
    diabetes = risks.get("diabetes", 0)
    stroke = risks.get("stroke", 0)
    hypertension = risks.get("hypertension", 0)

    # Diet recommendations
    if diabetes > 40:
        recs["diet"].extend([
            "Limit refined carbohydrates and sugary beverages",
            "Include high-fiber foods: oats, lentils, vegetables",
            "Eat small, frequent meals to regulate blood sugar",
            "Choose whole grains over refined grains",
        ])
    if heart > 40 or hypertension > 40:
        recs["diet"].extend([
            "Reduce sodium intake — avoid processed and packaged foods",
            "Increase omega-3 rich foods: fish, flaxseeds, walnuts",
            "Include potassium-rich foods: bananas, sweet potatoes, spinach",
            "Adopt a Mediterranean-style diet with olive oil and vegetables",
        ])
    if bmi > 25:
        recs["diet"].extend([
            "Create a moderate calorie deficit — avoid crash diets",
            "Increase protein intake to maintain muscle mass",
            "Stay hydrated — drink 8–10 glasses of water daily",
        ])

    # Deduplicate
    recs["diet"] = list(dict.fromkeys(recs["diet"]))[:5]

    # Exercise recommendations
    exercise_freq = profile.get("exercise_freq", "never")
    if exercise_freq in ["never", "rarely"]:
        recs["exercise"].extend([
            "Start with 20–30 minutes of brisk walking 5 days a week",
            "Gradually introduce low-impact cardio: swimming, cycling",
            "Include light strength training twice a week",
        ])
    elif exercise_freq == "sometimes":
        recs["exercise"].extend([
            "Aim for at least 150 minutes of moderate exercise per week",
            "Add interval training to improve cardiovascular health",
        ])
    else:
        recs["exercise"].extend([
            "Maintain your exercise routine — great work!",
            "Consider adding yoga or stretching for flexibility",
        ])

    # Lifestyle
    if smoking:
        recs["lifestyle"].append("Quit smoking immediately — it is the #1 preventable risk factor for heart disease and stroke")
    if alcohol:
        recs["lifestyle"].append("Limit alcohol to less than 1 drink/day for women, 2 for men")
    recs["lifestyle"].extend([
        "Get 7–9 hours of quality sleep each night",
        "Practice stress management: meditation, deep breathing, or yoga",
        "Monitor your blood pressure at home regularly",
    ])

    # Preventive care
    recs["preventive_care"].extend([
        "Get a comprehensive blood panel done every 6 months",
        "Monitor blood pressure weekly",
        "Schedule an annual physical exam with your doctor",
    ])
    if diabetes > 50:
        recs["preventive_care"].append("Get HbA1c tested every 3 months")
    if heart > 50:
        recs["preventive_care"].append("Consider an ECG and cardiac stress test")

    # Doctor consultation urgency
    max_risk = max(heart, diabetes, stroke, hypertension)
    if max_risk >= 70:
        recs["doctor_consultation"].append({
            "urgency": "HIGH",
            "message": "⚠️ Please consult a doctor within the next 1–2 weeks. Your risk levels are elevated.",
            "specialist": "Cardiologist / Endocrinologist / General Physician"
        })
    elif max_risk >= 45:
        recs["doctor_consultation"].append({
            "urgency": "MEDIUM",
            "message": "Schedule a doctor visit within the next month for a routine checkup.",
            "specialist": "General Physician"
        })
    else:
        recs["doctor_consultation"].append({
            "urgency": "LOW",
            "message": "Your risk levels are manageable. Annual checkups are recommended.",
            "specialist": "General Physician"
        })

    return recs
