"""
LifeSet Smart Diet & Exercise Plan Generator v2
Personalizes plans using health profile, risk scores, BMI,
AND actual report analysis results (diseases confirmed by lab).
"""

SERIOUS_DISEASES = [
    "cancer", "tumor", "malignancy", "carcinoma", "lymphoma", "leukemia",
    "melanoma", "sarcoma", "metastasis", "oncology",
    "heart attack", "myocardial infarction", "cardiac arrest",
    "stroke", "cerebrovascular", "kidney failure", "renal failure",
    "liver failure", "cirrhosis", "sepsis", "septicemia",
    "pulmonary embolism", "aortic aneurysm", "hiv", "aids",
]

def _has_serious_disease(text: str) -> bool:
    t = text.lower()
    return any(d in t for d in SERIOUS_DISEASES)

def _extract_report_conditions(reports: list) -> dict:
    conditions = {
        "has_diabetes": False, "has_prediabetes": False,
        "has_high_cholesterol": False, "has_anemia": False,
        "has_hypothyroid": False, "has_hyperthyroid": False,
        "has_hypertension": False, "has_kidney_issue": False,
        "has_liver_issue": False, "has_high_uric": False,
        "has_vitamin_d_deficiency": False, "has_b12_deficiency": False,
        "serious_disease": None,
    }
    if not reports:
        return conditions
    import json
    for report in reports:
        analysis = report.get("analysis") if isinstance(report, dict) else {}
        if isinstance(analysis, str):
            try: analysis = json.loads(analysis)
            except: analysis = {}
        if not isinstance(analysis, dict):
            analysis = {}
        abnormal = analysis.get("abnormal", {}) or {}
        condition_summary = analysis.get("condition_summary", []) or []

        for cs in condition_summary:
            if not isinstance(cs, dict): continue
            verdict = (cs.get("verdict") or "").lower()
            cond    = (cs.get("condition") or "").lower()
            if "diabetes" in cond:
                if "high" in verdict or "diagnosis" in verdict: conditions["has_diabetes"] = True
                elif "borderline" in verdict or "prediabetes" in verdict: conditions["has_prediabetes"] = True
            if "cholesterol" in cond or "heart" in cond:
                if "high" in verdict or "elevated" in verdict: conditions["has_high_cholesterol"] = True
            if "anemia" in cond:
                if "low" in verdict or "detected" in verdict: conditions["has_anemia"] = True
            if "thyroid" in cond:
                if "hypothyroid" in verdict: conditions["has_hypothyroid"] = True
                elif "hyperthyroid" in verdict: conditions["has_hyperthyroid"] = True

        for k, v in (abnormal.items() if isinstance(abnormal, dict) else []):
            if not isinstance(v, dict): continue
            status = v.get("status", "")
            label  = (v.get("label") or k).lower()
            if ("glucose" in label or "hba1c" in label) and status == "high": conditions["has_diabetes"] = True
            if ("glucose" in label or "hba1c" in label) and status == "borderline": conditions["has_prediabetes"] = True
            if ("cholesterol" in label or "ldl" in label) and status in ("high","borderline"): conditions["has_high_cholesterol"] = True
            if "hemoglobin" in label and status == "low": conditions["has_anemia"] = True
            if "tsh" in label and status == "high": conditions["has_hypothyroid"] = True
            if "tsh" in label and status == "low": conditions["has_hyperthyroid"] = True
            if "creatinine" in label and status == "high": conditions["has_kidney_issue"] = True
            if ("sgpt" in label or "sgot" in label) and status in ("high","borderline"): conditions["has_liver_issue"] = True
            if "uric" in label and status == "high": conditions["has_high_uric"] = True
            if "vitamin d" in label and status == "low": conditions["has_vitamin_d_deficiency"] = True
            if "b12" in label and status == "low": conditions["has_b12_deficiency"] = True
            if ("systolic" in label or "blood pressure" in label) and status in ("high","borderline"): conditions["has_hypertension"] = True

        for field in ("suggestions", "issues_found"):
            for item in (analysis.get(field) or []):
                if _has_serious_disease(str(item)) and not conditions["serious_disease"]:
                    conditions["serious_disease"] = str(item)
    return conditions


def generate_diet_plan(profile: dict, risks: dict, reports: list = None) -> dict:
    bmi    = risks.get("bmi", 24)
    heart  = risks.get("heart", 0)
    diab   = risks.get("diabetes", 0)
    hypert = risks.get("hypertension", 0)
    is_veg = profile.get("diet_type", "mixed") in ["vegetarian", "vegan"]

    rc = _extract_report_conditions(reports or [])
    confirmed_diabetes     = rc["has_diabetes"]           or rc["has_prediabetes"] or diab > 40
    confirmed_cholesterol  = rc["has_high_cholesterol"]   or heart > 40
    confirmed_anemia       = rc["has_anemia"]
    confirmed_kidney       = rc["has_kidney_issue"]
    confirmed_liver        = rc["has_liver_issue"]
    confirmed_uric         = rc["has_high_uric"]
    confirmed_hypothyroid  = rc["has_hypothyroid"]
    confirmed_hyperthyroid = rc["has_hyperthyroid"]
    confirmed_vit_d        = rc["has_vitamin_d_deficiency"]
    confirmed_b12          = rc["has_b12_deficiency"]
    confirmed_hypert       = rc["has_hypertension"]       or hypert > 40

    calorie_note = (
        "Low calorie (1400–1600 kcal/day for weight loss)" if bmi > 30
        else "Moderate calorie (1600–1800 kcal/day)" if bmi > 25
        else "Balanced (1800–2200 kcal/day)"
    )

    if confirmed_diabetes:
        breakfast = [
            "Oatmeal with chia seeds, berries, and cinnamon (no sugar added)",
            "2 boiled eggs + 1 slice whole wheat toast + cucumber slices",
            "Moong dal chilla (2 pieces) with green chutney",
        ]
        lunch = [
            "Brown rice (½ cup) + dal + sabzi + large salad with olive oil dressing",
            "Multigrain roti (2) + palak paneer (less oil) + cucumber raita",
            "Quinoa vegetable bowl with lemon-turmeric dressing",
        ]
        dinner = [
            "Light dal soup + 1 roti + sautéed vegetables (no rice at night)",
            "Grilled tofu/paneer + stir-fried vegetables",
            "Moong dal khichdi (light) + low-fat yogurt",
        ]
        snacks = ["Handful of mixed nuts (unsalted)", "1 small apple or pear", "Roasted chana (small bowl)"]
    elif confirmed_cholesterol or confirmed_hypert:
        breakfast = [
            "Oats upma with vegetables and flaxseeds",
            "Whole grain roti with dal and banana",
            "Greek yogurt with walnuts, flaxseeds, and mixed berries",
        ]
        lunch = [
            "Grilled fish/paneer + steamed vegetables + small portion brown rice",
            "Dal + 2 rotis + baingan bharta + mixed salad",
            "Chickpea salad with olive oil, lemon, onion, tomato",
        ]
        dinner = [
            "Vegetable soup + 2 rotis + dal",
            "Baked fish/paneer + roasted vegetables",
            "Lentil soup + multigrain bread + salad",
        ]
        snacks = ["Green tea + 4 almonds", "Cucumber/carrot sticks with hummus", "1 fruit (apple, pear, or orange)"]
    elif confirmed_kidney:
        breakfast = ["White bread toast + low-potassium jam + 1 egg (if cleared)", "Oatmeal with apple (peeled) + rice milk", "Note: Follow nephrologist's specific fluid and electrolyte guidelines"]
        lunch     = ["White rice + low-potassium vegetables (cabbage, green beans) + curd", "2 rotis + dal (low phosphorus) + cucumber salad", "Always follow your nephrologist's potassium/phosphorus limits"]
        dinner    = ["Steamed rice + boiled vegetables (low-K) + very small dal portion", "Plain roti + low-K sabzi", "Avoid tomato-heavy curries"]
        snacks    = ["White bread with butter (low potassium)", "Apple (peeled)", "Avoid bananas, oranges, nuts"]
    elif confirmed_anemia:
        breakfast = ["Spinach paratha + 1 glass orange juice (boosts iron absorption)", "Poha with curry leaves and lemon", "Iron-fortified cereal + low-fat milk"]
        lunch     = ["Rajma/chickpea curry + 2 rotis + lemon on food", "Soya chunk curry + brown rice + salad with lemon dressing", "Dal palak (spinach dal) + rice + salad"]
        dinner    = ["Palak paneer + 1 roti + brown rice (small portion)", "Lentil soup + multigrain bread + salad", "Moong dal + roti + cooked spinach"]
        snacks    = ["Dates (2–3) + a handful of pumpkin seeds", "Iron-fortified biscuits + lemon water", "Dry fruits: raisins + almonds"]
    elif confirmed_liver:
        breakfast = ["Oatmeal with banana (easy to digest)", "2 plain rotis + dal (no frying)", "Steamed idli with sambar (no oil)"]
        lunch     = ["Khichdi + boiled vegetables + curd", "Plain rice + moong dal + steamed vegetables", "Soft roti + light dal + cucumber"]
        dinner    = ["Steamed vegetables + 1–2 plain rotis + thin dal soup", "Vegetable soup + plain bread", "Light khichdi + yogurt"]
        snacks    = ["Banana or apple", "Low-fat yogurt", "Plain rice crackers"]
    elif bmi > 25:
        breakfast = ["Vegetable poha with sprouts (no sugar)", "2 egg whites scrambled + 1 brown bread toast", "Smoothie: spinach, banana, almond milk (no added sugar)"]
        lunch     = ["Dal rice + sabzi + salad + curd (small portions)", "2 rotis + mixed vegetable curry + buttermilk", "Quinoa salad with chickpeas and lemon dressing"]
        dinner    = ["Light soup + 1 roti + sautéed vegetables (no rice)", "Grilled paneer + vegetables", "Moong dal khichdi + salad"]
        snacks    = ["Green tea + 4 almonds", "Cucumber/carrot sticks with hummus", "1 fruit (apple, pear, or orange)"]
    else:
        breakfast = ["Idli (3) with sambar and coconut chutney", "Paratha (1, minimal oil) with curd + mixed fruit bowl", "Oatmeal with honey, nuts, and banana"]
        lunch     = ["Dal rice + sabzi + salad + curd", "2 rotis + mixed vegetable curry + buttermilk", "Rajma chawal + salad"]
        dinner    = ["2 rotis + dal + sabzi + salad", "Vegetable pulao + raita", "Khichdi + curd"]
        snacks    = ["Sprouts chaat", "Fruit salad", "Whole grain crackers with peanut butter"]

    if confirmed_anemia:
        breakfast.append("Spinach paratha + orange juice (if not already listed)")
    if confirmed_hypothyroid:
        breakfast.append("Note: Avoid raw cruciferous vegetables (cabbage, broccoli) — cook them")
    if not is_veg and not confirmed_kidney and not confirmed_liver:
        breakfast.append("Boiled eggs (2) with multigrain toast and avocado")
        lunch.append("Grilled chicken breast + quinoa + steamed broccoli")

    avoid = ["Refined sugar and sweets", "White bread and maida products", "Deep fried foods", "Packaged/processed snacks"]
    if confirmed_diabetes: avoid.extend(["Sugary drinks", "White rice in large portions", "Fruit juices", "Honey/jaggery in excess"])
    if confirmed_cholesterol: avoid.extend(["Trans fats and margarine", "Excess salt", "Red meat > 2x/week", "Full-fat dairy"])
    if confirmed_hypert: avoid.extend(["Canned/preserved foods (high sodium)", "Excess caffeine", "Alcohol", "Papad and pickles"])
    if confirmed_kidney: avoid.extend(["Bananas, oranges, potatoes (high potassium)", "Excess protein", "Salt substitutes"])
    if confirmed_liver: avoid.extend(["Alcohol completely", "Fatty and oily foods", "Raw shellfish"])
    if confirmed_uric: avoid.extend(["Red meat and organ meats", "Seafood: sardines, anchovies", "Alcohol (especially beer)"])
    if confirmed_hypothyroid: avoid.extend(["Raw soy products in excess", "Raw cruciferous vegetables in large amounts"])
    if bmi > 25: avoid.extend(["Late night eating", "Sugary beverages"])

    special_notes = []
    if confirmed_anemia: special_notes.append("🩸 Anemia: Eat iron-rich foods with vitamin C. Avoid tea/coffee 1 hour after meals.")
    if confirmed_vit_d: special_notes.append("☀️ Vitamin D deficiency: 15–20 min morning sunlight. Take supplements as prescribed.")
    if confirmed_b12: special_notes.append("💊 B12 deficiency: Supplement daily. Include dairy, eggs, or fortified foods.")
    if confirmed_hypothyroid: special_notes.append("🦋 Hypothyroid: Take medication on empty stomach. Cook cruciferous vegetables before eating.")
    if confirmed_hyperthyroid: special_notes.append("🦋 Hyperthyroid: Avoid excess iodine. Include calcium-rich foods for bone health.")
    if confirmed_kidney: special_notes.append("🫘 Kidney health: Strictly follow your nephrologist's fluid and electrolyte guidelines.")
    if confirmed_liver: special_notes.append("🫀 Liver health: Eat small frequent meals. No alcohol under any circumstance.")
    if confirmed_uric: special_notes.append("🦵 Uric acid: Drink 3–4 liters water daily. Eat cherries and low-fat dairy.")

    water_goal = "3–4 liters" if bmi > 25 or confirmed_kidney else "2.5–3 liters"

    return {
        "calorie_goal":  calorie_note,
        "breakfast":     breakfast,
        "lunch":         lunch,
        "snacks":        snacks,
        "dinner":        dinner,
        "avoid":         list(dict.fromkeys(avoid))[:10],
        "hydration":     f"Drink {water_goal} of water daily. Start with 1 glass of warm water in the morning.",
        "special_notes": special_notes,
        "report_based":  len(special_notes) > 0,
        "general_tips":  [
            "Eat slowly and mindfully — chew each bite well",
            "Don't skip breakfast — it sets metabolism for the day",
            "Eat dinner at least 2 hours before bedtime",
            "Use smaller plates to naturally reduce portions",
            "⚠️ Always consult your doctor or dietitian before making major dietary changes.",
        ]
    }


def generate_exercise_plan(profile: dict, risks: dict, reports: list = None) -> dict:
    age           = profile.get("age") or 30
    bmi           = risks.get("bmi", 24)
    heart         = risks.get("heart", 0)
    diab          = risks.get("diabetes", 0)
    hypert        = risks.get("hypertension", 0)
    exercise_freq = profile.get("exercise_freq", "never")

    rc = _extract_report_conditions(reports or [])
    confirmed_diabetes    = rc["has_diabetes"] or rc["has_prediabetes"] or diab > 40
    confirmed_cholesterol = rc["has_high_cholesterol"] or heart > 40
    confirmed_hypert      = rc["has_hypertension"] or hypert > 40
    confirmed_anemia      = rc["has_anemia"]
    confirmed_kidney      = rc["has_kidney_issue"]
    confirmed_liver       = rc["has_liver_issue"]
    confirmed_hypothyroid = rc["has_hypothyroid"]

    if exercise_freq in ["never", "rarely"]:   level = "beginner"
    elif exercise_freq == "sometimes":          level = "intermediate"
    else:                                       level = "active"

    if level == "beginner":
        weekly_plan = [
            {"day": "Monday",    "activity": "Brisk walking",                              "duration": "20 min", "intensity": "Light"},
            {"day": "Tuesday",   "activity": "Gentle yoga (Sukhasana, Balasana)",           "duration": "20 min", "intensity": "Light"},
            {"day": "Wednesday", "activity": "Rest / Light stretching",                     "duration": "10 min", "intensity": "Very Light"},
            {"day": "Thursday",  "activity": "Brisk walking + breathing exercises",         "duration": "25 min", "intensity": "Light"},
            {"day": "Friday",    "activity": "Yoga: Tadasana, Trikonasana",                 "duration": "20 min", "intensity": "Light"},
            {"day": "Saturday",  "activity": "Cycling or swimming",                         "duration": "20 min", "intensity": "Moderate"},
            {"day": "Sunday",    "activity": "Rest / Family walk",                          "duration": "15 min", "intensity": "Very Light"},
        ]
    elif level == "intermediate":
        weekly_plan = [
            {"day": "Monday",    "activity": "Brisk walking + jogging intervals",           "duration": "30 min", "intensity": "Moderate"},
            {"day": "Tuesday",   "activity": "Yoga: Surya Namaskar (5 rounds) + Pranayama", "duration": "30 min", "intensity": "Moderate"},
            {"day": "Wednesday", "activity": "Strength training (bodyweight)",               "duration": "25 min", "intensity": "Moderate"},
            {"day": "Thursday",  "activity": "Swimming or cycling",                          "duration": "30 min", "intensity": "Moderate"},
            {"day": "Friday",    "activity": "Yoga + core exercises",                        "duration": "30 min", "intensity": "Moderate"},
            {"day": "Saturday",  "activity": "Longer walk/hike or dance",                   "duration": "45 min", "intensity": "Moderate"},
            {"day": "Sunday",    "activity": "Rest or gentle stretching",                    "duration": "15 min", "intensity": "Very Light"},
        ]
    else:
        weekly_plan = [
            {"day": "Monday",    "activity": "Running / HIIT (20 min) + core",              "duration": "40 min", "intensity": "High"},
            {"day": "Tuesday",   "activity": "Strength training (full body)",                "duration": "45 min", "intensity": "High"},
            {"day": "Wednesday", "activity": "Yoga: Surya Namaskar (10 rounds) + Pranayama","duration": "40 min", "intensity": "Moderate"},
            {"day": "Thursday",  "activity": "Cycling / Swimming",                          "duration": "45 min", "intensity": "Moderate"},
            {"day": "Friday",    "activity": "HIIT or circuit training",                    "duration": "35 min", "intensity": "High"},
            {"day": "Saturday",  "activity": "Outdoor activity: hiking, sports, cycling",   "duration": "60 min", "intensity": "Moderate"},
            {"day": "Sunday",    "activity": "Rest + light yoga / meditation",               "duration": "20 min", "intensity": "Very Light"},
        ]

    # Disease-specific modifications to weekly plan
    if confirmed_diabetes:
        for day in weekly_plan:
            if day["intensity"] == "High": day["intensity"] = "Moderate"
            if "walking" in day["activity"].lower():
                day["activity"] += " (post-meal walk recommended for blood sugar control)"
    if confirmed_hypert or confirmed_cholesterol:
        for day in weekly_plan:
            if "HIIT" in day["activity"] or "Running" in day["activity"]:
                day["activity"] = "Brisk walking/light jogging"
                day["intensity"] = "Moderate"
    if confirmed_kidney or confirmed_liver:
        for day in weekly_plan:
            if day["intensity"] == "High":
                day["intensity"] = "Light"
                day["activity"] = "Gentle walking or light yoga (consult doctor first)"

    # Yoga
    if confirmed_diabetes:
        yoga = [
            {"pose": "Mandukasana (Frog pose)",  "benefit": "Stimulates pancreas, helps insulin", "duration": "5 min"},
            {"pose": "Dhanurasana (Bow pose)",    "benefit": "Massages abdominal organs",          "duration": "3 min"},
            {"pose": "Kapalbhati Pranayama",      "benefit": "Improves metabolism",                "duration": "10 min"},
            {"pose": "Paschimottanasana",         "benefit": "Stimulates digestion",               "duration": "5 min"},
        ]
    elif confirmed_hypert or confirmed_cholesterol:
        yoga = [
            {"pose": "Anulom Vilom Pranayama",   "benefit": "Reduces blood pressure and stress",  "duration": "10 min"},
            {"pose": "Shavasana",                "benefit": "Deep relaxation, lowers heart rate",  "duration": "5 min"},
            {"pose": "Bhramari (Humming Bee)",   "benefit": "Calms nervous system",               "duration": "5 min"},
            {"pose": "Viparita Karani",          "benefit": "Improves circulation",               "duration": "5 min"},
        ]
    elif bmi > 25:
        yoga = [
            {"pose": "Surya Namaskar",           "benefit": "Full body workout, burns calories",  "duration": "15 min"},
            {"pose": "Utkatasana (Chair pose)",  "benefit": "Strengthens legs, burns fat",        "duration": "3 min"},
            {"pose": "Navasana (Boat pose)",     "benefit": "Core strengthening",                 "duration": "3 min"},
            {"pose": "Trikonasana (Triangle)",   "benefit": "Stretches and tones",                "duration": "5 min"},
        ]
    else:
        yoga = [
            {"pose": "Surya Namaskar",           "benefit": "Overall health and flexibility",     "duration": "15 min"},
            {"pose": "Vrikshasana (Tree pose)",  "benefit": "Balance and focus",                  "duration": "5 min"},
            {"pose": "Bhujangasana (Cobra)",     "benefit": "Back strength and posture",          "duration": "5 min"},
            {"pose": "Shavasana",                "benefit": "Stress relief and recovery",         "duration": "5 min"},
        ]

    cautions = []
    if heart > 60 or confirmed_cholesterol:
        cautions.append("⚠️ Avoid high-intensity exercises until cleared by a cardiologist")
    if confirmed_hypert:
        cautions.append("⚠️ Avoid heavy weightlifting and breath-holding. Keep heart rate below 140 bpm.")
    if confirmed_diabetes:
        cautions.append("⚠️ Check blood sugar before and after exercise. Carry glucose tablets.")
        cautions.append("⚠️ Avoid exercise if fasting glucose is above 250 mg/dL — consult doctor first.")
    if confirmed_anemia:
        cautions.append("⚠️ Anemia: Start very light and gradually increase. Avoid vigorous exercise until hemoglobin improves.")
    if confirmed_kidney:
        cautions.append("⚠️ Kidney disease: Only light to moderate exercise. Avoid dehydration. Consult nephrologist first.")
    if confirmed_liver:
        cautions.append("⚠️ Liver condition: Stick to gentle walking and yoga only.")
    if confirmed_hypothyroid:
        cautions.append("⚠️ Hypothyroid: Energy levels may be low. Morning exercise helps. Start slow and stay consistent.")
    if bmi > 35:
        cautions.append("⚠️ Start very slowly — focus on walking and swimming to protect joints")
    if age > 60:
        cautions.append("⚠️ Always warm up for 10 min before exercise and cool down after")

    return {
        "fitness_level":   level.capitalize(),
        "weekly_plan":     weekly_plan,
        "yoga":            yoga,
        "daily_steps_goal": "8,000–10,000 steps/day" if bmi > 25 else "7,000–8,000 steps/day",
        "warm_up":         "Always start with 5–10 min warm-up: neck rolls, shoulder rotations, ankle circles, light marching",
        "cool_down":       "End with 5 min cool-down: slow walk + static stretches",
        "cautions":        cautions,
        "report_based":    any("report" in str(c).lower() or "⚠️" in c for c in cautions),
        "morning_routine": [
            "Wake up and drink 1 glass of warm water with lemon",
            "5 min light stretching in bed",
            "10 min Pranayama (deep breathing)",
            "Main exercise session",
            "Cool down + healthy breakfast",
        ]
    }
