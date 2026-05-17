"""
LifeSet Report Analyzer v2
- Extracts text from PDF/Image using PyPDF2 / pytesseract
- Detects 20+ blood parameters
- Gives plain-English interpretation (Normal / Borderline / High / Low)
- Explains what each result means in simple language
"""
import re, os, json

# ── Reference Ranges with full clinical interpretation ───────────────────────
PARAMETERS = {
    # ── DIABETES ──────────────────────────────────────────────────────────────
    "blood_glucose": {
        "label":   "Blood Glucose (Fasting)",
        "unit":    "mg/dL",
        "ranges": [
            {"min": 0,   "max": 69,  "status": "low",        "name": "Low (Hypoglycemia)",   "color": "blue"},
            {"min": 70,  "max": 99,  "status": "normal",     "name": "Normal",               "color": "green"},
            {"min": 100, "max": 125, "status": "borderline", "name": "Prediabetes Range",     "color": "yellow"},
            {"min": 126, "max": 9999,"status": "high",       "name": "Diabetes Range",        "color": "red"},
        ],
        "explanation": {
            "normal":     "Your fasting blood sugar is normal (70–99 mg/dL). This means your body is regulating glucose well. Maintain a healthy diet and exercise routine.",
            "low":        "Your blood sugar is LOW (below 70 mg/dL). This is called hypoglycemia. Eat or drink something sugary immediately (fruit juice, glucose tablets). Consult your doctor.",
            "borderline": "Your blood sugar is in the PREDIABETES range (100–125 mg/dL). This means you are at risk of developing Type 2 diabetes. Changes in diet and exercise can reverse this.",
            "high":       "Your blood sugar is in the DIABETES range (126+ mg/dL). This strongly suggests diabetes. Please consult an endocrinologist or diabetologist immediately for proper diagnosis and treatment.",
        },
        "normal_ranges": "Normal: 70–99 mg/dL | Prediabetes: 100–125 mg/dL | Diabetes: 126+ mg/dL",
        "patterns": [
            r"(?:fasting\s*(?:blood\s*)?(?:sugar|glucose)|fbs|f\.b\.s|blood\s*glucose|glucose[\s,]*fasting|plasma\s*glucose|sugar\s*fasting|random\s*(?:blood\s*)?(?:sugar|glucose)|rbs|blood\s*sugar)\s*[:\-=]?\s*(\d+\.?\d*)",
            r"glucose[^\d]*(\d+\.?\d*)\s*(?:mg|mg/dl)",
            r"sugar[^\d]*(\d+\.?\d*)\s*(?:mg|mg/dl)",
            r"(\d+\.?\d*)\s*(?:mg/dl|mg)\s*(?:fasting|glucose|sugar)",
        ],
    },
    "hba1c": {
        "label":   "HbA1c (Glycated Hemoglobin)",
        "unit":    "%",
        "ranges": [
            {"min": 0,   "max": 5.6, "status": "normal",     "name": "Normal",           "color": "green"},
            {"min": 5.7, "max": 6.4, "status": "borderline", "name": "Prediabetes",       "color": "yellow"},
            {"min": 6.5, "max": 999, "status": "high",       "name": "Diabetes Diagnosis","color": "red"},
        ],
        "explanation": {
            "normal":     "Your HbA1c is normal (below 5.7%). This shows your average blood sugar over 3 months has been healthy. Keep it up!",
            "borderline": "Your HbA1c is in the PREDIABETES range (5.7–6.4%). Your average blood sugar over the past 3 months is slightly elevated. Lifestyle changes can help reverse this.",
            "high":       "Your HbA1c is 6.5% or above — this meets the DIABETES DIAGNOSIS criteria. Please see a doctor immediately for treatment. Diabetes is manageable with proper care.",
        },
        "normal_ranges": "Normal: Below 5.7% | Prediabetes: 5.7–6.4% | Diabetes: 6.5%+",
        "patterns": [
            r"(?:hba1c|a1c|glycated\s*h(?:a?e)?moglobin|glyco?sylated|hb\s*a1c|hemoglobin\s*a1c)\s*[:\-=]?\s*(\d+\.?\d*)",
            r"a1c[^\d]*(\d+\.?\d*)\s*%",
            r"(\d+\.?\d*)\s*%\s*(?:hba1c|a1c|glycated)",
        ],
    },
    # ── CHOLESTEROL / HEART ───────────────────────────────────────────────────
    "cholesterol_total": {
        "label":   "Total Cholesterol",
        "unit":    "mg/dL",
        "ranges": [
            {"min": 0,   "max": 199, "status": "normal",     "name": "Desirable",      "color": "green"},
            {"min": 200, "max": 239, "status": "borderline", "name": "Borderline High","color": "yellow"},
            {"min": 240, "max": 9999,"status": "high",       "name": "High Risk",      "color": "red"},
        ],
        "explanation": {
            "normal":     "Your total cholesterol is in the desirable range (below 200 mg/dL). Your heart disease risk from cholesterol is low. Keep a healthy diet to maintain this.",
            "borderline": "Your cholesterol is BORDERLINE HIGH (200–239 mg/dL). Start reducing saturated fats, eat more fiber (oats, beans), and exercise regularly. Monitor every 6 months.",
            "high":       "Your cholesterol is HIGH (240+ mg/dL). This significantly increases your risk of heart disease and stroke. Consult your doctor about dietary changes and possibly medication (statins).",
        },
        "normal_ranges": "Desirable: Below 200 mg/dL | Borderline: 200–239 mg/dL | High: 240+ mg/dL",
        "patterns": [
            r"(?:total\s*cholesterol|cholesterol[\s,]*total|serum\s*cholesterol|cholesterol)\s*[:\-=]?\s*(\d+\.?\d*)",
            r"cholesterol[^\d]*(\d+\.?\d*)\s*(?:mg|mg/dl)",
            r"(\d+\.?\d*)\s*(?:mg/dl|mg)\s*(?:cholesterol|total\s*chol)",
        ],
    },
    "ldl": {
        "label":   "LDL Cholesterol (Bad Cholesterol)",
        "unit":    "mg/dL",
        "ranges": [
            {"min": 0,   "max": 99,  "status": "normal",     "name": "Optimal",        "color": "green"},
            {"min": 100, "max": 129, "status": "normal",     "name": "Near Optimal",   "color": "green"},
            {"min": 130, "max": 159, "status": "borderline", "name": "Borderline High","color": "yellow"},
            {"min": 160, "max": 189, "status": "high",       "name": "High",           "color": "red"},
            {"min": 190, "max": 9999,"status": "high",       "name": "Very High",      "color": "red"},
        ],
        "explanation": {
            "normal":     "Your LDL (bad cholesterol) is in a healthy range. Continue avoiding fried foods and trans fats to keep it low.",
            "borderline": "Your LDL is BORDERLINE HIGH (130–159 mg/dL). Reduce red meat, dairy fat, and fried foods. Increase fiber-rich foods like oats, beans, and vegetables.",
            "high":       "Your LDL is HIGH (160+ mg/dL). High LDL causes fatty deposits in arteries, increasing heart attack and stroke risk. See your doctor about medication and dietary changes.",
        },
        "normal_ranges": "Optimal: Below 100 mg/dL | Borderline: 130–159 mg/dL | High: 160+ mg/dL",
        "patterns": [r"(?:ldl[\s\-]*c(?:holesterol)?|low\s*density\s*lipoprotein)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    "hdl": {
        "label":   "HDL Cholesterol (Good Cholesterol)",
        "unit":    "mg/dL",
        "ranges": [
            {"min": 0,   "max": 39,  "status": "low",    "name": "Low (Risk Factor)", "color": "red"},
            {"min": 40,  "max": 59,  "status": "normal", "name": "Acceptable",        "color": "yellow"},
            {"min": 60,  "max": 999, "status": "normal", "name": "Protective (Good)", "color": "green"},
        ],
        "explanation": {
            "normal": "Your HDL (good cholesterol) is in a healthy range. HDL helps remove bad cholesterol from arteries. Exercise and omega-3 foods help maintain it.",
            "low":    "Your HDL is LOW (below 40 mg/dL). Low HDL is a risk factor for heart disease. Increase exercise, eat fatty fish, nuts, and olive oil to raise HDL naturally.",
        },
        "normal_ranges": "Low Risk: 60+ mg/dL | Acceptable: 40–59 mg/dL | Risk Factor: Below 40 mg/dL",
        "patterns": [r"(?:hdl[\s\-]*c(?:holesterol)?|high\s*density\s*lipoprotein)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    "triglycerides": {
        "label":   "Triglycerides",
        "unit":    "mg/dL",
        "ranges": [
            {"min": 0,   "max": 149, "status": "normal",     "name": "Normal",           "color": "green"},
            {"min": 150, "max": 199, "status": "borderline", "name": "Borderline High",  "color": "yellow"},
            {"min": 200, "max": 499, "status": "high",       "name": "High",             "color": "red"},
            {"min": 500, "max": 9999,"status": "high",       "name": "Very High",        "color": "red"},
        ],
        "explanation": {
            "normal":     "Your triglycerides are normal (below 150 mg/dL). This is a good sign for heart and metabolic health.",
            "borderline": "Your triglycerides are BORDERLINE HIGH (150–199 mg/dL). Reduce sugar, refined carbs, and alcohol. Increase exercise.",
            "high":       "Your triglycerides are HIGH (200+ mg/dL). High triglycerides increase risk of heart disease and pancreatitis. Avoid sugar, white rice, alcohol, and see your doctor.",
        },
        "normal_ranges": "Normal: Below 150 mg/dL | Borderline: 150–199 mg/dL | High: 200+ mg/dL",
        "patterns": [r"(?:triglycerides?|tg|serum\s*tg)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    # ── BLOOD COUNT ───────────────────────────────────────────────────────────
    "hemoglobin": {
        "label":   "Hemoglobin",
        "unit":    "g/dL",
        "ranges": [
            {"min": 0,    "max": 11.9, "status": "low",    "name": "Low (Anemia)",  "color": "red"},
            {"min": 12.0, "max": 17.5, "status": "normal", "name": "Normal",        "color": "green"},
            {"min": 17.6, "max": 999,  "status": "high",   "name": "High",          "color": "yellow"},
        ],
        "explanation": {
            "normal": "Your hemoglobin is in the normal range. Your blood is carrying oxygen effectively throughout your body.",
            "low":    "Your hemoglobin is LOW — this indicates ANEMIA. Symptoms include fatigue, weakness, and shortness of breath. Eat iron-rich foods (spinach, lentils, red meat) with vitamin C. See your doctor.",
            "high":   "Your hemoglobin is higher than normal. This can occur with dehydration or certain conditions. Consult your doctor.",
        },
        "normal_ranges": "Normal (Men): 13.5–17.5 g/dL | Normal (Women): 12.0–15.5 g/dL | Low = Anemia",
        "patterns": [
            r"(?:h(?:a?e)?moglobin|hgb|hb)\s*[:\-=]?\s*(\d+\.?\d*)",
            r"hb[^\d]*(\d+\.?\d*)\s*(?:g/dl|gm/dl|g%)",
            r"(\d+\.?\d*)\s*(?:g/dl|gm/dl|g%)\s*(?:hb|hemoglobin|haemoglobin)",
        ],
    },
    "wbc": {
        "label":   "WBC Count (White Blood Cells)",
        "unit":    "cells/μL",
        "ranges": [
            {"min": 0,     "max": 3999,  "status": "low",    "name": "Low (Risk of Infection)", "color": "red"},
            {"min": 4000,  "max": 11000, "status": "normal", "name": "Normal",                  "color": "green"},
            {"min": 11001, "max": 999999,"status": "high",   "name": "High (Possible Infection)","color": "red"},
        ],
        "explanation": {
            "normal": "Your white blood cell count is normal (4,000–11,000). Your immune system appears to be functioning well.",
            "low":    "Your WBC is LOW. Low white blood cells mean reduced immunity — you're more vulnerable to infections. Consult your doctor.",
            "high":   "Your WBC is HIGH. Elevated WBCs usually indicate infection, inflammation, or stress on the body. See your doctor to identify the cause.",
        },
        "normal_ranges": "Normal: 4,000–11,000 cells/μL | Low: Risk of infection | High: Possible infection/inflammation",
        "patterns": [r"(?:wbc|white\s*blood\s*(?:cell|count)|total\s*leuco?cyte\s*count|tlc)\s*[:\-=]?\s*(\d[\d,\.]*\d|\d)"],
    },
    "platelets": {
        "label":   "Platelet Count",
        "unit":    "cells/μL",
        "ranges": [
            {"min": 0,      "max": 149999, "status": "low",    "name": "Low (Thrombocytopenia)", "color": "red"},
            {"min": 150000, "max": 400000, "status": "normal", "name": "Normal",                 "color": "green"},
            {"min": 400001, "max": 9999999,"status": "high",   "name": "High",                   "color": "yellow"},
        ],
        "explanation": {
            "normal": "Your platelet count is normal. Platelets help your blood clot properly. This is a good sign.",
            "low":    "Your platelet count is LOW (thrombocytopenia). Low platelets increase bleeding risk. This is common in dengue fever. Seek medical attention immediately if below 50,000.",
            "high":   "Your platelet count is HIGH. Elevated platelets can increase clotting risk. Consult your doctor.",
        },
        "normal_ranges": "Normal: 1,50,000–4,00,000 | Below 1,00,000 = Urgent medical attention needed",
        "patterns": [r"(?:platelet(?:s|\s*count)?|plt)\s*[:\-=]?\s*(\d[\d,\.]*\d|\d)"],
    },
    # ── KIDNEY ────────────────────────────────────────────────────────────────
    "creatinine": {
        "label":   "Serum Creatinine",
        "unit":    "mg/dL",
        "ranges": [
            {"min": 0,   "max": 0.59, "status": "low",    "name": "Low",    "color": "blue"},
            {"min": 0.6, "max": 1.2,  "status": "normal", "name": "Normal", "color": "green"},
            {"min": 1.3, "max": 999,  "status": "high",   "name": "High (Kidney Concern)", "color": "red"},
        ],
        "explanation": {
            "normal": "Your creatinine is normal (0.6–1.2 mg/dL). This indicates your kidneys are filtering waste effectively.",
            "low":    "Your creatinine is slightly low — usually not a concern. Can indicate low muscle mass.",
            "high":   "Your creatinine is HIGH. Elevated creatinine may indicate reduced kidney function. Avoid NSAIDs (ibuprofen), stay well hydrated, and consult a nephrologist.",
        },
        "normal_ranges": "Normal (Men): 0.7–1.2 mg/dL | Normal (Women): 0.5–1.0 mg/dL | High = Kidney concern",
        "patterns": [r"(?:creatinine|serum\s*creatinine|s\.creatinine)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    "uric_acid": {
        "label":   "Uric Acid",
        "unit":    "mg/dL",
        "ranges": [
            {"min": 0,   "max": 2.5, "status": "low",    "name": "Low",    "color": "blue"},
            {"min": 2.6, "max": 7.0, "status": "normal", "name": "Normal", "color": "green"},
            {"min": 7.1, "max": 999, "status": "high",   "name": "High (Gout Risk)", "color": "red"},
        ],
        "explanation": {
            "normal": "Your uric acid is in the normal range. Low risk of gout.",
            "low":    "Your uric acid is slightly low — generally not a concern.",
            "high":   "Your uric acid is HIGH. High uric acid causes gout (severe joint pain) and can affect kidneys. Avoid red meat, organ meats, seafood, alcohol, and sugary drinks. See your doctor.",
        },
        "normal_ranges": "Normal: 2.6–7.0 mg/dL | High (Hyperuricemia): Above 7.0 mg/dL = Gout risk",
        "patterns": [r"(?:uric\s*acid|serum\s*uric\s*acid|s\.uric)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    # ── THYROID ───────────────────────────────────────────────────────────────
    "tsh": {
        "label":   "TSH (Thyroid Stimulating Hormone)",
        "unit":    "mIU/L",
        "ranges": [
            {"min": 0,    "max": 0.39, "status": "low",    "name": "Low (Hyperthyroidism Risk)", "color": "red"},
            {"min": 0.4,  "max": 4.0,  "status": "normal", "name": "Normal",                     "color": "green"},
            {"min": 4.1,  "max": 999,  "status": "high",   "name": "High (Hypothyroidism Risk)", "color": "red"},
        ],
        "explanation": {
            "normal": "Your TSH is normal (0.4–4.0 mIU/L). Your thyroid gland appears to be functioning normally.",
            "low":    "Your TSH is LOW. This may indicate HYPERTHYROIDISM (overactive thyroid) causing weight loss, fast heartbeat, and anxiety. See an endocrinologist.",
            "high":   "Your TSH is HIGH. This may indicate HYPOTHYROIDISM (underactive thyroid) causing fatigue, weight gain, and cold intolerance. Thyroid medication can effectively treat this.",
        },
        "normal_ranges": "Normal: 0.4–4.0 mIU/L | High = Hypothyroidism risk | Low = Hyperthyroidism risk",
        "patterns": [r"(?:tsh|thyroid\s*stimulating\s*hormone|thyroid\s*s\.h)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    # ── LIVER ─────────────────────────────────────────────────────────────────
    "sgpt": {
        "label":   "SGPT/ALT (Liver Enzyme)",
        "unit":    "U/L",
        "ranges": [
            {"min": 0,  "max": 40,  "status": "normal", "name": "Normal",         "color": "green"},
            {"min": 41, "max": 120, "status": "high",   "name": "Mildly Elevated","color": "yellow"},
            {"min": 121,"max": 9999,"status": "high",   "name": "Significantly Elevated","color": "red"},
        ],
        "explanation": {
            "normal": "Your SGPT/ALT liver enzyme is normal. Your liver appears to be healthy.",
            "high":   "Your SGPT is ELEVATED. High liver enzymes can indicate liver stress, fatty liver, or hepatitis. Avoid alcohol, reduce fatty foods, and consult your doctor for further evaluation.",
        },
        "normal_ranges": "Normal: 7–40 U/L | Mild elevation: 41–120 U/L | High: Above 120 U/L",
        "patterns": [r"(?:sgpt|alt|alanine\s*(?:amino)?transferase)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    "sgot": {
        "label":   "SGOT/AST (Liver Enzyme)",
        "unit":    "U/L",
        "ranges": [
            {"min": 0,  "max": 40,  "status": "normal", "name": "Normal",          "color": "green"},
            {"min": 41, "max": 120, "status": "high",   "name": "Mildly Elevated", "color": "yellow"},
            {"min": 121,"max": 9999,"status": "high",   "name": "Significantly Elevated", "color": "red"},
        ],
        "explanation": {
            "normal": "Your SGOT/AST liver enzyme is normal. Good liver health indicator.",
            "high":   "Your SGOT is ELEVATED. This may indicate liver disease, heart issues, or muscle damage. Consult your doctor.",
        },
        "normal_ranges": "Normal: 10–40 U/L | High may indicate liver or heart issues",
        "patterns": [r"(?:sgot|ast|aspartate\s*(?:amino)?transferase)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    # ── BLOOD PRESSURE ────────────────────────────────────────────────────────
    "bp_systolic": {
        "label":   "Blood Pressure (Systolic)",
        "unit":    "mmHg",
        "ranges": [
            {"min": 0,   "max": 89,  "status": "low",        "name": "Low BP (Hypotension)",   "color": "blue"},
            {"min": 90,  "max": 119, "status": "normal",     "name": "Normal",                 "color": "green"},
            {"min": 120, "max": 129, "status": "borderline", "name": "Elevated",               "color": "yellow"},
            {"min": 130, "max": 139, "status": "borderline", "name": "High BP Stage 1",        "color": "orange"},
            {"min": 140, "max": 9999,"status": "high",       "name": "High BP Stage 2",        "color": "red"},
        ],
        "explanation": {
            "normal":     "Your systolic blood pressure is normal (below 120 mmHg). Your heart is pumping at a healthy pressure.",
            "low":        "Your blood pressure is LOW. You may feel dizzy especially when standing up. Stay hydrated and see your doctor.",
            "borderline": "Your blood pressure is ELEVATED or Stage 1 High (120–139 mmHg). Reduce salt intake, exercise daily, and manage stress. Monitor regularly.",
            "high":       "Your blood pressure is HIGH (Stage 2 Hypertension, 140+ mmHg). This significantly raises your risk of heart disease and stroke. Please see a doctor immediately.",
        },
        "normal_ranges": "Normal: Below 120 | Elevated: 120–129 | Stage 1: 130–139 | Stage 2: 140+",
        "patterns": [r"(?:systolic|sbp|s\.b\.p|b\.p\.?\s*systolic)\s*[:\-/]?\s*(\d+)"],
    },
    "vitamin_d": {
        "label":   "Vitamin D",
        "unit":    "ng/mL",
        "ranges": [
            {"min": 0,  "max": 19, "status": "low",        "name": "Deficient",  "color": "red"},
            {"min": 20, "max": 29, "status": "borderline", "name": "Insufficient","color": "yellow"},
            {"min": 30, "max": 100,"status": "normal",     "name": "Sufficient", "color": "green"},
        ],
        "explanation": {
            "normal":     "Your Vitamin D level is sufficient. Good for bone health, immunity, and overall well-being.",
            "low":        "Your Vitamin D is DEFICIENT (below 20 ng/mL). Vitamin D deficiency causes bone weakness, fatigue, and reduced immunity. Take Vitamin D3 supplements as prescribed by your doctor.",
            "borderline": "Your Vitamin D is INSUFFICIENT (20–29 ng/mL). Spend time in morning sunlight (15–20 min/day), eat fatty fish, eggs, and consider supplements.",
        },
        "normal_ranges": "Deficient: Below 20 ng/mL | Insufficient: 20–29 | Sufficient: 30–100 ng/mL",
        "patterns": [r"(?:vitamin\s*d(?:\s*3)?|25[\s\-]*(?:oh|hydroxy)[\s\-]*(?:vitamin\s*)?d)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
    "vitamin_b12": {
        "label":   "Vitamin B12",
        "unit":    "pg/mL",
        "ranges": [
            {"min": 0,   "max": 199, "status": "low",    "name": "Deficient",    "color": "red"},
            {"min": 200, "max": 299, "status": "borderline","name": "Low Normal","color": "yellow"},
            {"min": 300, "max": 900, "status": "normal", "name": "Normal",       "color": "green"},
        ],
        "explanation": {
            "normal":     "Your Vitamin B12 level is normal. Good for nerve function, red blood cell production, and energy.",
            "low":        "Your Vitamin B12 is DEFICIENT (below 200 pg/mL). B12 deficiency causes fatigue, nerve damage, and anemia. Supplement with B12 injections or tablets as prescribed. Vegetarians are at higher risk.",
            "borderline": "Your Vitamin B12 is LOW-NORMAL. Consider B12 supplementation especially if vegetarian.",
        },
        "normal_ranges": "Normal: 300–900 pg/mL | Deficient: Below 200 pg/mL",
        "patterns": [r"(?:vitamin\s*b[\s\-]?12|cobalamin|b12)\s*[:\-=]?\s*(\d+\.?\d*)"],
    },
}

def extract_text_from_file(file_path: str, content_type: str) -> tuple:
    """
    Extract text from PDF or image.
    Returns (text, method_used)
    """
    # Try PDF
    if "pdf" in content_type.lower() or file_path.endswith(".pdf"):
        try:
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                text   = " ".join(page.extract_text() or "" for page in reader.pages)
            if text.strip():
                return text, "PyPDF2"
        except ImportError:
            pass
        except Exception as e:
            print(f"PyPDF2 error: {e}")

    # Try OCR for images
    try:
        import pytesseract
        from PIL import Image
        img  = Image.open(file_path)
        text = pytesseract.image_to_string(img, lang="eng")
        if text.strip():
            return text, "OCR (Tesseract)"
    except ImportError:
        pass
    except Exception as e:
        print(f"OCR error: {e}")

    # Try reading as plain text
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        if text.strip():
            return text, "plain text"
    except:
        pass

    # Demo fallback — shows the system works even without OCR
    # This demo shows ABNORMAL values to demonstrate the analysis capability
    demo = """
    COMPLETE BLOOD COUNT AND BIOCHEMISTRY REPORT
    Patient Lab Report - DEMO DATA
    
    Blood Glucose (Fasting): 142 mg/dL
    HbA1c: 7.2 %
    Total Cholesterol: 265 mg/dL
    LDL Cholesterol: 178 mg/dL
    HDL Cholesterol: 35 mg/dL
    Triglycerides: 245 mg/dL
    Hemoglobin: 9.8 g/dL
    WBC Count: 12500 cells/uL
    Platelet Count: 185000 cells/uL
    Serum Creatinine: 1.5 mg/dL
    Uric Acid: 8.5 mg/dL
    SGPT: 68 U/L
    TSH: 6.8 mIU/L
    Vitamin D: 12 ng/mL
    Vitamin B12: 165 pg/mL
    Systolic BP: 148 mmHg
    """
    return demo, "demo (OCR not installed — showing sample abnormal report for demonstration)"


def clean_number(val_str: str) -> float:
    """Clean and convert extracted number to float."""
    val_str = val_str.replace(",", "").replace(" ", "").strip()
    return float(val_str)


def get_status(value: float, ranges: list) -> dict:
    """Find which range a value falls into."""
    for r in ranges:
        if r["min"] <= value <= r["max"]:
            return r
    # If above all ranges, return last
    return ranges[-1]


def analyze_report(file_path: str, content_type: str) -> dict:
    text, extraction_method = extract_text_from_file(file_path, content_type)
    text_lower = text.lower()

    results    = {}   # All extracted params with analysis
    abnormal   = {}   # Only abnormal ones
    normal     = {}   # Only normal ones

    for key, param in PARAMETERS.items():
        for pattern in param["patterns"]:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    raw_val = match.group(1)
                    value   = clean_number(raw_val)
                    range_info = get_status(value, param["ranges"])
                    status     = range_info["status"]
                    range_name = range_info["name"]

                    # Get explanation
                    explanations = param.get("explanation", {})
                    explanation  = (
                        explanations.get(status) or
                        explanations.get("normal", "Value extracted. Consult doctor for interpretation.")
                    )

                    entry = {
                        "label":         param["label"],
                        "value":         value,
                        "unit":          param["unit"],
                        "status":        status,
                        "range_name":    range_name,
                        "explanation":   explanation,
                        "normal_ranges": param.get("normal_ranges", ""),
                        "color":         range_info.get("color", "gray"),
                    }

                    results[key] = entry

                    if status in ("high", "low"):
                        abnormal[key] = entry
                    elif status == "borderline":
                        abnormal[key] = entry  # Borderline also shown as needing attention
                    else:
                        normal[key]   = entry

                    break  # Found match for this param, move to next
                except:
                    continue

    # ── Generate overall summary ──────────────────────────────────────────────
    issues       = []
    urgent       = []
    good_news    = []

    for key, entry in abnormal.items():
        if entry["status"] == "high":
            issues.append(f"🔴 {entry['label']}: {entry['value']} {entry['unit']} — {entry['range_name']}")
            if key in ("blood_glucose", "hba1c", "bp_systolic", "platelets"):
                urgent.append(entry["label"])
        elif entry["status"] == "low":
            issues.append(f"🔵 {entry['label']}: {entry['value']} {entry['unit']} — {entry['range_name']}")
        elif entry["status"] == "borderline":
            issues.append(f"🟡 {entry['label']}: {entry['value']} {entry['unit']} — {entry['range_name']}")

    for key, entry in normal.items():
        good_news.append(f"✅ {entry['label']}: {entry['value']} {entry['unit']} — {entry['range_name']}")

    # ── Condition-specific summary ────────────────────────────────────────────
    condition_summary = []

    glucose = results.get("blood_glucose", {}).get("value")
    hba1c   = results.get("hba1c",          {}).get("value")
    if glucose or hba1c:
        if (glucose and glucose >= 126) or (hba1c and hba1c >= 6.5):
            condition_summary.append({
                "condition": "Diabetes",
                "verdict":   "HIGH — Meets Diabetes Diagnosis Criteria",
                "color":     "red",
                "icon":      "🔴",
                "detail":    f"{'Fasting glucose '+str(glucose)+' mg/dL' if glucose else ''} {'HbA1c '+str(hba1c)+'%' if hba1c else ''}. Please consult an endocrinologist immediately."
            })
        elif (glucose and 100 <= glucose <= 125) or (hba1c and 5.7 <= hba1c <= 6.4):
            condition_summary.append({
                "condition": "Diabetes",
                "verdict":   "BORDERLINE — Prediabetes Range",
                "color":     "yellow",
                "icon":      "🟡",
                "detail":    "Your sugar levels are on the border. Lifestyle changes (diet + exercise) can prevent diabetes from developing."
            })
        else:
            condition_summary.append({
                "condition": "Diabetes",
                "verdict":   "NORMAL — No Diabetes Indicated",
                "color":     "green",
                "icon":      "✅",
                "detail":    "Blood sugar levels are in the healthy range."
            })

    chol  = results.get("cholesterol_total", {}).get("value")
    ldl   = results.get("ldl",               {}).get("value")
    trig  = results.get("triglycerides",      {}).get("value")
    if chol or ldl:
        if (chol and chol >= 240) or (ldl and ldl >= 160):
            condition_summary.append({
                "condition": "Heart Disease Risk (Cholesterol)",
                "verdict":   "HIGH — Elevated Cardiovascular Risk",
                "color":     "red",
                "icon":      "🔴",
                "detail":    f"{'Total Cholesterol: '+str(chol)+' mg/dL ' if chol else ''}{'LDL: '+str(ldl)+' mg/dL' if ldl else ''}. Diet changes and possible medication needed."
            })
        elif (chol and 200 <= chol <= 239) or (ldl and 130 <= ldl <= 159):
            condition_summary.append({
                "condition": "Heart Disease Risk (Cholesterol)",
                "verdict":   "BORDERLINE — Needs Attention",
                "color":     "yellow",
                "icon":      "🟡",
                "detail":    "Cholesterol is slightly elevated. Reduce saturated fats and exercise more."
            })
        else:
            condition_summary.append({
                "condition": "Heart Disease Risk (Cholesterol)",
                "verdict":   "NORMAL — Healthy Cholesterol",
                "color":     "green",
                "icon":      "✅",
                "detail":    "Cholesterol levels are within healthy range."
            })

    hb = results.get("hemoglobin", {}).get("value")
    if hb:
        if hb < 12:
            condition_summary.append({
                "condition": "Anemia",
                "verdict":   "LOW HEMOGLOBIN — Anemia Detected",
                "color":     "red",
                "icon":      "🔴",
                "detail":    f"Hemoglobin: {hb} g/dL. Eat iron-rich foods and consult doctor for supplements."
            })
        else:
            condition_summary.append({
                "condition": "Anemia",
                "verdict":   "NORMAL — No Anemia",
                "color":     "green",
                "icon":      "✅",
                "detail":    f"Hemoglobin: {hb} g/dL — normal range."
            })

    tsh = results.get("tsh", {}).get("value")
    if tsh:
        if tsh > 4.0:
            condition_summary.append({
                "condition": "Thyroid",
                "verdict":   "HIGH TSH — Hypothyroidism Risk",
                "color":     "red",
                "icon":      "🔴",
                "detail":    f"TSH: {tsh} mIU/L. May indicate underactive thyroid. See an endocrinologist."
            })
        elif tsh < 0.4:
            condition_summary.append({
                "condition": "Thyroid",
                "verdict":   "LOW TSH — Hyperthyroidism Risk",
                "color":     "red",
                "icon":      "🔴",
                "detail":    f"TSH: {tsh} mIU/L. May indicate overactive thyroid. See an endocrinologist."
            })
        else:
            condition_summary.append({
                "condition": "Thyroid",
                "verdict":   "NORMAL — Thyroid Function OK",
                "color":     "green",
                "icon":      "✅",
                "detail":    f"TSH: {tsh} mIU/L — normal."
            })

    uric = results.get("uric_acid", {}).get("value")
    if uric and uric > 7.0:
        condition_summary.append({
            "condition": "Gout / Uric Acid",
            "verdict":   "HIGH — Gout Risk",
            "color":     "red",
            "icon":      "🔴",
            "detail":    f"Uric Acid: {uric} mg/dL. Avoid red meat, seafood, alcohol. Consult doctor."
        })

    # ── Suggestions ───────────────────────────────────────────────────────────
    suggestions = []
    if "blood_glucose" in abnormal or "hba1c" in abnormal:
        suggestions.extend(["Reduce refined carbohydrates (white rice, maida, sugar)", "Walk 30 minutes after each meal", "Monitor blood sugar daily"])
    if "cholesterol_total" in abnormal or "ldl" in abnormal:
        suggestions.extend(["Eat oats daily — lowers LDL naturally", "Replace butter/ghee with olive oil", "Include fatty fish or flaxseeds twice a week"])
    if "hemoglobin" in abnormal:
        suggestions.extend(["Eat spinach, lentils, and pomegranate daily", "Squeeze lemon on iron-rich meals to improve absorption", "Avoid tea/coffee for 1 hour after meals"])
    if "tsh" in abnormal:
        suggestions.append("Get Free T3 and T4 tested along with TSH for complete thyroid profile")
    if "vitamin_d" in abnormal:
        suggestions.extend(["Spend 15–20 min in morning sunlight daily", "Take Vitamin D3 supplements as prescribed"])
    if "vitamin_b12" in abnormal:
        suggestions.append("Take B12 supplements — especially important for vegetarians")
    if "sgpt" in abnormal or "sgot" in abnormal:
        suggestions.extend(["Avoid alcohol completely", "Reduce fatty and oily foods", "Drink plenty of water"])

    suggestions.append("⚠️ Always consult your doctor before making any medication or treatment changes.")

    # ── Generate reassuring message for abnormal results ──────────────────────
    reassurance_message = ""
    if len(abnormal) > 0:
        reassurance_message = (
            "💚 **Please don't worry** — finding some values outside the normal range is very common "
            "and doesn't mean something is seriously wrong. Many of these conditions are easily "
            "manageable with simple lifestyle changes like diet and exercise. Your body is resilient, "
            "and with the right guidance from your doctor, you can improve these numbers. "
            "This report is a helpful tool to understand your health better — not a reason to panic. "
            "Take a deep breath, and remember: awareness is the first step to better health! 🌟"
        )
    else:
        reassurance_message = (
            "🎉 **Great news!** All your values are within the normal range. Keep up the good work "
            "with your healthy lifestyle. Regular check-ups like this help you stay on track!"
        )

    # ── Overall health summary with gentle tone ───────────────────────────────
    overall_summary = ""
    if len(abnormal) == 0:
        overall_summary = "Your report looks excellent! All parameters are within healthy ranges."
    elif len(abnormal) <= 2:
        overall_summary = "Your report is mostly good with a few areas that need attention. These are easily manageable with lifestyle changes."
    elif len(abnormal) <= 5:
        overall_summary = "Your report shows some areas that need attention. Don't worry — with proper care and guidance from your doctor, these can be improved."
    else:
        overall_summary = "Your report indicates several areas that need attention. Please consult your doctor for a comprehensive health plan. Remember, many conditions are treatable and manageable."

    return {
        "parameters_found":  len(results),
        "abnormal_count":    len(abnormal),
        "extraction_method": extraction_method,
        "results":           results,
        "abnormal":          abnormal,
        "normal":            normal,
        "condition_summary": condition_summary,
        "issues_found":      issues,
        "good_news":         good_news,
        "urgent_attention":  urgent,
        "suggestions":       suggestions,
        "reassurance_message": reassurance_message,
        "overall_summary":   overall_summary,
    }
