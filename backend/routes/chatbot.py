"""
LifeSet AI Health Chatbot v5
Uses multiple free AI APIs with automatic fallback:
1. Groq API (free tier - 14,400 requests/day) 
2. OpenRouter free models
3. Built-in knowledge base

Get your FREE Groq API key at: https://console.groq.com/keys
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import json
import ssl

# Try to import requests (better SSL handling), fallback to urllib
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.error
    HAS_REQUESTS = False

router = APIRouter()

# ── API Configuration ─────────────────────────────────────────────────────────
# Get your FREE Groq API key at: https://console.groq.com/keys (takes 30 seconds)
# Groq free tier: 14,400 requests/day, 6,000 tokens/min
import os
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")  # Set via environment variable

# Alternative: HuggingFace Inference API (free)
# Get free API key at: https://huggingface.co/settings/tokens
HF_API_KEY = os.getenv("HF_API_KEY", "")  # Set via environment variable

GROQ_MODEL = "llama-3.1-8b-instant"  # Fast and free on Groq

# Diseases that require a gentle, reassuring tone + instant doctor referral
SERIOUS_DISEASE_KEYWORDS = [
    "cancer", "tumor", "tumour", "malignancy", "carcinoma", "lymphoma",
    "leukemia", "leukaemia", "melanoma", "sarcoma", "metastasis", "oncology",
    "heart attack", "myocardial infarction", "cardiac arrest",
    "stroke", "cerebrovascular accident", "brain hemorrhage",
    "kidney failure", "renal failure", "end stage renal",
    "liver failure", "liver cirrhosis", "hepatic failure",
    "sepsis", "septicemia", "blood poisoning",
    "pulmonary embolism", "blood clot in lung",
    "aortic aneurysm", "hiv positive", "aids",
    "multiple sclerosis", "als", "amyotrophic lateral sclerosis",
    "parkinson", "alzheimer", "dementia",
    "lupus", "autoimmune", "rheumatoid arthritis severe",
]

def _detect_serious_disease(text: str) -> str | None:
    """Return the first serious disease keyword found, or None."""
    t = text.lower()
    for kw in SERIOUS_DISEASE_KEYWORDS:
        if kw in t:
            return kw
    return None

SYSTEM_PROMPT = """You are LifeSet Health Assistant — a warm, caring, and intelligent AI assistant
built into the LifeSet preventive healthcare platform.

Your capabilities:
- Answer ANY question the user asks — health or non-health
- For health topics: give detailed, accurate, helpful guidance
- For general topics (coding, science, math, etc.): answer helpfully
- Be warm, conversational, empathetic, and easy to understand
- Keep answers clear and concise (2-4 paragraphs usually enough)
- Use bullet points when listing multiple items
- Use **bold** for important points

CRITICAL — SERIOUS DISEASE PROTOCOL:
If the user mentions, has been diagnosed with, or asks about a serious illness
(cancer, tumor, heart attack, stroke, kidney failure, liver failure, HIV/AIDS,
multiple sclerosis, ALS, Parkinson's, Alzheimer's, sepsis, or similar):
1. NEVER be blunt or clinical — speak with deep warmth, empathy, and gentleness
2. NEVER list frightening statistics or worst-case scenarios
3. ALWAYS begin with an acknowledgment of how they must be feeling
4. Frame everything in terms of hope, management, and quality of life
5. Remind them that many people live full lives with proper care and support
6. ALWAYS end with: "Please consult your doctor or specialist immediately — they
   are your best guide and will create a personalized care plan just for you.
   You do not have to face this alone."

URGENT SYMPTOM PROTOCOL:
If a user describes symptoms that could indicate a serious condition
(severe chest pain, sudden severe headache, sudden weakness/numbness,
difficulty breathing, coughing blood, unexplained weight loss, persistent fever,
blood in urine/stool), ALWAYS say:
"These symptoms need immediate medical attention. Please consult your doctor
or visit a hospital as soon as possible — do not delay."

GENERAL RULE — ALWAYS end health advice with:
"Please consult your doctor for personalized advice tailored to your situation."

Health safety rules:
- Never prescribe specific prescription medications
- For emergencies always say: call 112 (India) immediately
- Never tell users to ignore symptoms
- Never cause unnecessary fear or panic
- Always be the caring, calm voice that gives hope

For non-health questions: answer directly and helpfully without health disclaimers."""


def call_groq_api(message: str, history: list, user_profile: dict = None) -> Optional[str]:
    """Call Groq API (free tier) and return response text."""
    if not GROQ_API_KEY:
        return None

    # Build context from user profile
    context = ""
    if user_profile:
        parts = []
        if user_profile.get("age"):             parts.append(f"Age: {user_profile['age']}")
        if user_profile.get("gender"):          parts.append(f"Gender: {user_profile['gender']}")
        if user_profile.get("medical_history"): parts.append(f"Medical history: {user_profile['medical_history']}")
        if user_profile.get("smoking"):         parts.append("Smoker: Yes")
        if parts:
            context = f"\n\n[Patient context: {', '.join(parts)}]"

    # Build messages array
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    for h in history[-10:]:
        role = "assistant" if h.get("role") == "assistant" else "user"
        messages.append({"role": role, "content": h.get("content", "")})
    
    messages.append({"role": "user", "content": message + context})

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7,
    }

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    try:
        if HAS_REQUESTS:
            # Use requests library (better SSL handling)
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"Groq API error {resp.status_code}: {resp.text}")
                return None
        else:
            # Fallback to urllib
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, timeout=30, context=ssl_context) as resp:
                data = json.loads(resp.read().decode())
                return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Groq API error: {e}")
        return None


def call_huggingface_api(message: str, history: list, user_profile: dict = None) -> Optional[str]:
    """Call HuggingFace Inference API (free) as fallback."""
    if not HF_API_KEY:
        return None
    
    # Build context
    context = ""
    if user_profile:
        parts = []
        if user_profile.get("age"):             parts.append(f"Age: {user_profile['age']}")
        if user_profile.get("gender"):          parts.append(f"Gender: {user_profile['gender']}")
        if user_profile.get("medical_history"): parts.append(f"Medical history: {user_profile['medical_history']}")
        if parts:
            context = f" [Patient: {', '.join(parts)}]"
    
    # Build conversation
    conversation = f"{SYSTEM_PROMPT}\n\nUser: {message}{context}\nAssistant:"
    
    payload = json.dumps({
        "inputs": conversation,
        "parameters": {
            "max_new_tokens": 500,
            "temperature": 0.7,
            "return_full_text": False
        }
    }).encode("utf-8")
    
    url = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {HF_API_KEY}"
        },
        method="POST",
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, list) and len(data) > 0:
                return data[0].get("generated_text", "")
            return None
    except Exception as e:
        print(f"HuggingFace API error: {e}")
        return None


def generate_smart_response(message: str, user_profile: dict = None) -> str:
    """Generate intelligent response using pattern matching and templates."""
    msg_l = message.lower()
    
    # Build context
    context_parts = []
    if user_profile:
        if user_profile.get("age"): context_parts.append(f"age {user_profile['age']}")
        if user_profile.get("gender"): context_parts.append(user_profile['gender'])
    context_str = f" (considering you are {', '.join(context_parts)})" if context_parts else ""
    
    # ── Digestion / Stomach Issues ────────────────────────────────────────────
    if any(w in msg_l for w in ["digestion", "digest", "stomach", "gastric", "acidity", "bloating", "gas", "indigestion", "constipation", "diarrhea", "loose motion", "bowel"]):
        if "eat" in msg_l or "food" in msg_l or "diet" in msg_l:
            return f"""For better digestion{context_str}, here's what I recommend:

**Foods that help digestion:**
• **Yogurt/Curd** — Contains probiotics that improve gut health
• **Papaya** — Has enzymes (papain) that break down proteins
• **Ginger** — Reduces bloating and nausea; try ginger tea
• **Bananas** — Easy to digest and restore electrolytes
• **Oatmeal** — High fiber, gentle on stomach
• **Fennel seeds (Saunf)** — Chew after meals to reduce gas
• **Buttermilk (Chaas)** — Cooling and aids digestion

**Foods to AVOID:**
• Fried and oily foods
• Spicy food (temporarily)
• Carbonated drinks
• Raw vegetables if you have active issues
• Dairy (except yogurt) if lactose intolerant

**Helpful habits:**
• Eat slowly and chew thoroughly
• Don't lie down immediately after eating
• Drink warm water, not cold
• Walk for 10-15 minutes after meals

Please consult your doctor if symptoms persist for more than a week. 💚"""
        else:
            return f"""I understand you're having digestion issues{context_str}. Here's some guidance:

**Common causes:**
• Eating too fast or overeating
• Spicy, oily, or processed foods
• Stress and anxiety
• Lack of fiber in diet
• Dehydration

**Quick relief tips:**
• Drink warm water with lemon
• Try ginger or peppermint tea
• Chew fennel seeds (saunf) after meals
• Avoid lying down for 2-3 hours after eating
• Take a gentle 10-minute walk

**When to see a doctor:**
• Symptoms last more than 2 weeks
• Blood in stool
• Unexplained weight loss
• Severe pain

Would you like specific diet recommendations for your digestion issues? 💚"""

    # ── Headache ──────────────────────────────────────────────────────────────
    if any(w in msg_l for w in ["headache", "head pain", "head ache", "migraine", "head hurts"]):
        return f"""I'm sorry you're dealing with a headache{context_str}. Here's what can help:

**Immediate relief:**
• Drink 2-3 glasses of water (dehydration is the #1 cause)
• Rest in a dark, quiet room
• Apply a cold compress to your forehead
• Take paracetamol if needed (follow dosage instructions)

**Common causes:**
• Dehydration
• Stress and tension
• Eye strain (too much screen time)
• Poor sleep
• Skipped meals
• Caffeine withdrawal

**Prevention tips:**
• Stay hydrated throughout the day
• Take screen breaks every 30 minutes
• Get 7-8 hours of sleep
• Manage stress with deep breathing

**⚠️ See a doctor immediately if:**
• Sudden, severe "thunderclap" headache
• Headache with fever and stiff neck
• Headache after head injury
• Vision changes or confusion

Please consult your doctor if headaches are frequent or severe. 💚"""

    # ── Sleep Issues ──────────────────────────────────────────────────────────
    if any(w in msg_l for w in ["sleep", "insomnia", "can't sleep", "sleeping", "tired", "fatigue", "exhausted"]):
        return f"""Sleep is crucial for health{context_str}. Here's how to improve it:

**Good sleep habits:**
• Go to bed and wake up at the same time daily
• Keep your room cool (18-22°C), dark, and quiet
• No screens 1 hour before bed (blue light disrupts sleep)
• Avoid caffeine after 2 PM
• Don't eat heavy meals close to bedtime

**Natural sleep aids:**
• Warm milk with a pinch of turmeric
• Chamomile tea
• Deep breathing exercises (4-7-8 technique)
• Light stretching or yoga before bed
• Reading a physical book

**If you're always tired:**
• Could indicate iron deficiency or thyroid issues
• Get a blood test (CBC, thyroid panel, Vitamin D, B12)
• Check for sleep apnea if you snore

**Adults need 7-9 hours of quality sleep.**

Please consult your doctor if sleep problems persist for more than 2 weeks. 💚"""

    # ── Weight / Diet ─────────────────────────────────────────────────────────
    if any(w in msg_l for w in ["weight", "lose weight", "fat", "obesity", "overweight", "slim", "diet plan"]):
        return f"""Here's a healthy approach to weight management{context_str}:

**Healthy eating principles:**
• Fill half your plate with vegetables
• Choose whole grains over refined (brown rice, whole wheat)
• Include protein in every meal (dal, eggs, chicken, paneer)
• Limit sugar to under 25g per day
• Avoid processed and packaged foods

**Effective habits:**
• Eat slowly — it takes 20 minutes to feel full
• Drink water before meals
• Don't skip breakfast
• Avoid eating after 8 PM
• Get 7-8 hours of sleep (poor sleep causes weight gain)

**Exercise recommendations:**
• Start with 30 minutes of brisk walking daily
• Add strength training 2-3 times per week
• Consistency matters more than intensity

**Realistic goals:**
• Aim for 0.5-1 kg per week (sustainable)
• Crash diets don't work long-term

Please consult a dietitian for a personalized plan. 💚"""

    # ── Skin Issues ───────────────────────────────────────────────────────────
    if any(w in msg_l for w in ["skin", "acne", "pimple", "rash", "itching", "eczema", "dry skin"]):
        return f"""For skin health{context_str}, here's what helps:

**General skin care:**
• Drink 8-10 glasses of water daily
• Eat fruits and vegetables rich in vitamins A, C, E
• Get adequate sleep (skin repairs during sleep)
• Protect from sun with SPF 30+ sunscreen

**For acne/pimples:**
• Wash face twice daily with gentle cleanser
• Don't touch or pick at pimples
• Change pillowcases frequently
• Reduce dairy and sugar intake
• Use non-comedogenic products

**For dry/itchy skin:**
• Moisturize immediately after bathing
• Use lukewarm water, not hot
• Choose fragrance-free products
• Use a humidifier in dry weather

**See a dermatologist if:**
• Skin issues persist despite home care
• You notice unusual moles or growths
• Severe itching or spreading rash

Please consult a dermatologist for persistent skin issues. 💚"""

    # ── Mental Health ─────────────────────────────────────────────────────────
    if any(w in msg_l for w in ["stress", "anxiety", "anxious", "worried", "depression", "sad", "mental", "panic", "nervous"]):
        return f"""Mental health is just as important as physical health{context_str}. Here's support:

**Immediate calming techniques:**
• **4-7-8 Breathing:** Inhale 4 sec, hold 7 sec, exhale 8 sec
• **Grounding:** Name 5 things you see, 4 you hear, 3 you feel
• Step outside for fresh air and sunlight
• Talk to someone you trust

**Daily habits that help:**
• Regular exercise (even 20 min walk helps)
• Consistent sleep schedule
• Limit caffeine and alcohol
• Reduce social media time
• Practice gratitude journaling

**Professional help:**
• Talking to a counselor or therapist is a sign of strength
• Cognitive Behavioral Therapy (CBT) is very effective
• Medication can help when prescribed by a psychiatrist

**You are not alone.** Many people experience these feelings, and help is available.

If you're having thoughts of self-harm, please call iCall: 9152987821 or Vandrevala Foundation: 1860-2662-345. 💚"""

    # ── Pregnancy ─────────────────────────────────────────────────────────────
    if any(w in msg_l for w in ["pregnant", "pregnancy", "conceive", "conception", "baby", "prenatal"]):
        return f"""Pregnancy is a special time{context_str}. Here's important guidance:

**Essential prenatal care:**
• Start folic acid supplements (400mcg daily) before conception
• Regular prenatal checkups are crucial
• Take prescribed iron and calcium supplements
• Get all recommended vaccinations

**Healthy pregnancy diet:**
• Eat plenty of fruits, vegetables, whole grains
• Include protein: dal, eggs, fish (low mercury), lean meat
• Avoid: raw/undercooked food, unpasteurized dairy, excess caffeine
• Stay hydrated

**Warning signs to watch:**
• Severe headache or vision changes
• Heavy bleeding
• Severe abdominal pain
• Reduced baby movement (after 28 weeks)
• High fever

**Please consult your OB-GYN regularly** — they are your best guide throughout pregnancy. 💚"""

    # ── General health questions ──────────────────────────────────────────────
    if any(w in msg_l for w in ["healthy", "health tips", "stay healthy", "improve health", "wellness"]):
        return f"""Here are evidence-based tips for better health{context_str}:

**The 5 Pillars of Health:**

1. **Nutrition**
   • Eat more vegetables and fruits
   • Choose whole grains over refined
   • Limit sugar and processed foods
   • Stay hydrated (8 glasses/day)

2. **Exercise**
   • 150 minutes moderate activity per week
   • Include strength training twice weekly
   • Take walking breaks if sedentary job

3. **Sleep**
   • 7-9 hours for adults
   • Consistent sleep schedule
   • Dark, cool, quiet bedroom

4. **Stress Management**
   • Daily relaxation practice
   • Social connections
   • Hobbies and enjoyment

5. **Preventive Care**
   • Annual health checkups
   • Age-appropriate screenings
   • Stay up to date on vaccinations

Small consistent changes beat dramatic short-term efforts. 💚"""

    # ── Vitamins / Supplements ────────────────────────────────────────────────
    if any(w in msg_l for w in ["vitamin", "supplement", "deficiency", "b12", "vitamin d", "iron", "calcium"]):
        return f"""Here's guidance on common vitamins and supplements{context_str}:

**Vitamin D:**
• Get 15-20 min morning sunlight daily
• Food sources: fatty fish, egg yolks, fortified milk
• Deficiency causes: fatigue, bone pain, weakness
• Normal range: 30-100 ng/mL

**Vitamin B12:**
• Important for nerves and blood cells
• Sources: meat, eggs, dairy (vegetarians at risk)
• Deficiency causes: fatigue, numbness, memory issues
• Vegetarians should consider supplements

**Iron:**
• Essential for blood and energy
• Sources: spinach, lentils, red meat, pomegranate
• Take with Vitamin C for better absorption
• Avoid tea/coffee with iron-rich meals

**Calcium:**
• For strong bones and teeth
• Sources: dairy, ragi, sesame seeds, leafy greens
• Adults need 1000mg daily

**Important:** Get a blood test before starting supplements. Too much can be harmful.

Please consult your doctor for personalized supplement advice. 💚"""

    # ── Default intelligent response ──────────────────────────────────────────
    return f"""Thank you for your question about "{message}"{context_str}.

I'm your LifeSet Health Assistant, and I'm here to help with:
• **Symptoms** — headache, fever, pain, fatigue, etc.
• **Diet & Nutrition** — what to eat, weight management
• **Lifestyle** — sleep, stress, exercise
• **Conditions** — diabetes, BP, thyroid, cholesterol
• **Wellness** — vitamins, supplements, prevention

Could you tell me more specifically what you'd like to know? For example:
• "What should I eat for better digestion?"
• "How can I improve my sleep?"
• "What are symptoms of diabetes?"

I'm here to help! 💚

**Note:** For personalized medical advice, please consult your doctor."""

# ── Built-in Knowledge Base (fallback when no API key) ───────────────────────

KB = {
    "chest pain":       {"r": "Chest pain can range from muscle strain to serious cardiac issues. If you have severe, crushing pain spreading to your arm, jaw, or back — call 112 immediately. For mild discomfort, rest and monitor closely.", "u": "high", "t": ["Call 112 if pain is severe or crushing", "Sit down and rest immediately", "Do not drive yourself to hospital", "Note when it started and any triggers"]},
    "heart attack":     {"r": "This is a medical emergency. Call 112 immediately. Symptoms: crushing chest pain, left arm pain, sweating, shortness of breath, nausea. Chew aspirin 300mg if available and not allergic. Do not drive yourself.", "u": "emergency", "t": ["Call 112 NOW", "Chew aspirin 300mg if not allergic", "Loosen tight clothing", "Lie down and stay calm"]},
    "headache":         {"r": "Most headaches are caused by dehydration, stress, eye strain, or poor sleep. Drink water, rest in a dark quiet room, apply a cold or warm compress. Seek urgent care for sudden severe headaches or those with fever and stiff neck.", "u": "low", "t": ["Drink 2-3 glasses of water immediately", "Rest in a dark, quiet room", "Apply a cold compress to forehead", "Avoid screens for 30 minutes"]},
    "fever":            {"r": "Fever means your immune system is fighting infection. Rest, drink plenty of fluids, use a cool compress. Paracetamol can reduce fever safely. Seek care if temperature exceeds 39.4°C, lasts more than 3 days, or comes with rash or difficulty breathing.", "u": "medium", "t": ["Drink fluids every hour — water, ORS, coconut water", "Rest completely", "Use cool damp cloth on forehead", "Paracetamol for relief — NOT ibuprofen for dengue"]},
    "cold":             {"r": "Common colds are viral — antibiotics don't help. Rest, drink warm fluids, use steam inhalation. Honey-lemon-ginger tea soothes the throat. Most colds resolve in 7-10 days.", "u": "low", "t": ["Drink warm honey-ginger tea", "Steam inhalation 2-3 times daily", "Saline nasal drops for congestion", "Wash hands often to avoid spreading"]},
    "cough":            {"r": "Coughs from viral infections usually clear with rest and hydration. Warm honey-lemon water helps. A cough lasting more than 3 weeks, producing blood, or with weight loss needs medical evaluation urgently.", "u": "low", "t": ["Drink warm honey-lemon water", "Steam inhalation helps loosen mucus", "Stay hydrated", "See a doctor if cough lasts more than 3 weeks"]},
    "fatigue":          {"r": "Persistent fatigue can indicate iron/B12 deficiency, thyroid issues, poor sleep, or diabetes. Ensure 7-9 hours of quality sleep, eat iron-rich foods, stay hydrated, and exercise regularly. Blood tests can identify the cause.", "u": "low", "t": ["Get 7-9 hours of quality sleep at consistent times", "Eat iron-rich foods: spinach, lentils, dates, red meat", "Stay well hydrated throughout the day", "Light exercise actually boosts energy levels"]},
    "diabetes":         {"r": "Diabetes management requires monitoring blood glucose, following a low-glycemic diet, regular exercise, and taking medications consistently. Avoid refined carbohydrates, sugary drinks, and processed foods. Regular HbA1c testing every 3 months is essential.", "u": "medium", "t": ["Monitor blood glucose daily and keep a log", "Eat low-GI foods: whole grains, legumes, vegetables", "30 min walk after meals significantly lowers blood sugar", "Never skip medications — consistency is critical"]},
    "blood pressure":   {"r": "High blood pressure rarely has symptoms but greatly raises stroke and heart disease risk. Reduce salt intake, exercise daily, manage stress, limit alcohol, and quit smoking. The DASH diet is highly effective. Take medications exactly as prescribed.", "u": "medium", "t": ["Cut sodium — avoid processed foods, pickles, papad", "Exercise 30 min daily — brisk walking is excellent", "Monitor BP at home with a digital device", "Medications must be taken every day without gaps"]},
    "cholesterol":      {"r": "High LDL cholesterol builds up in arteries and increases heart disease risk. Reduce saturated and trans fats, increase soluble fiber from oats and beans, exercise regularly, and include omega-3 rich foods. Statins may be prescribed for very high levels.", "u": "medium", "t": ["Eat oats daily — beta-glucan actively lowers LDL", "Replace butter with olive oil for cooking", "Include fatty fish or flaxseeds for omega-3", "Exercise 150 min/week raises protective HDL"]},
    "stress":           {"r": "Chronic stress raises cortisol, increasing risk of heart disease, diabetes, and depression. Regular exercise, mindfulness meditation, adequate sleep, and social connection are the most effective stress management tools.", "u": "low", "t": ["Exercise is one of the most powerful stress reducers", "10 min mindfulness or deep breathing daily", "Prioritize 7-9 hours of sleep", "Connect with friends and family regularly"]},
    "anxiety":          {"r": "Anxiety responds well to breathing techniques (4-7-8 method: inhale 4s, hold 7s, exhale 8s), regular exercise, limiting caffeine, and adequate sleep. Cognitive Behavioral Therapy (CBT) is the most effective long-term treatment.", "u": "medium", "t": ["Practice 4-7-8 breathing when anxious", "Limit caffeine — it worsens anxiety significantly", "Regular aerobic exercise reduces anxiety as effectively as medication", "Consider CBT therapy for lasting relief"]},
    "sleep":            {"r": "Adults need 7-9 hours of sleep. Poor sleep raises risk of obesity, diabetes, and heart disease. Consistent bed and wake times are the most important factor. Avoid screens 1 hour before bed and keep your room cool and dark.", "u": "low", "t": ["Go to bed at the same time every night", "No screens 1 hour before bed — use blue light filter", "Keep bedroom cool (18-20°C), dark, and quiet", "Avoid caffeine after 2pm — it has a 6-hour half-life"]},
    "diet":             {"r": "A healthy diet centers on whole foods: fill half your plate with vegetables, choose whole grains, include lean protein and healthy fats, and limit ultra-processed foods and refined sugar. The Mediterranean diet has the strongest evidence for longevity.", "u": "none", "t": ["Fill half your plate with colorful vegetables", "Choose whole grains over refined (brown rice, whole wheat)", "Include plant protein: lentils, chickpeas, tofu", "Limit sugar to under 25g per day (WHO recommendation)"]},
    "exercise":         {"r": "Regular physical activity is one of the most powerful preventive medicine tools. Aim for 150 min moderate aerobic exercise per week plus 2 strength training sessions. Even 20 min of brisk walking daily significantly reduces cardiovascular risk.", "u": "none", "t": ["Start with 20-30 min brisk walking 5 days a week", "Add strength training twice a week", "Consistency matters far more than intensity", "Find activities you enjoy — adherence is everything"]},
    "weight":           {"r": "Sustainable weight loss is 0.5-1kg per week through a moderate calorie deficit and regular exercise. Focus on whole foods, adequate protein to preserve muscle, and 150-300 min of exercise per week. Avoid crash diets — they cause muscle loss and rebound gain.", "u": "low", "t": ["Aim for 0.5kg/week loss — slow and sustainable", "Eat adequate protein to preserve muscle while losing fat", "Strength training builds metabolism", "Track food intake — awareness alone reduces consumption"]},
    "dengue":           {"r": "Dengue causes high fever, severe headache, eye pain, joint pain, and rash. Take ONLY paracetamol for fever — ibuprofen and aspirin increase bleeding risk. Monitor platelet count closely. Drink ORS and fluids constantly. Seek hospital care if platelets drop below 100,000.", "u": "high", "t": ["Take ONLY paracetamol — NEVER ibuprofen or aspirin for dengue", "Drink ORS, coconut water, and fluids constantly", "Monitor platelet count with daily blood tests", "Seek hospital care immediately if platelets drop sharply"]},
    "malaria":          {"r": "Malaria requires urgent medical treatment — do not delay. Symptoms: recurring fever with chills, sweating, headache, body aches. Antimalarial medications must be prescribed by a doctor. Use mosquito nets and DEET repellents for prevention.", "u": "high", "t": ["Seek medical care immediately — malaria needs prescription treatment", "Take all prescribed antimalarial medications to completion", "Sleep under insecticide-treated mosquito nets", "Eliminate standing water near your home"]},
    "thyroid":          {"r": "Hypothyroidism (underactive) causes fatigue, weight gain, and cold intolerance. Hyperthyroidism (overactive) causes weight loss and rapid heartbeat. Both need blood tests (TSH, T3, T4) to diagnose and are highly treatable with medication.", "u": "medium", "t": ["Get TSH blood test to confirm thyroid status", "Take thyroid medication at the same time every day", "Regular follow-up with endocrinologist is important", "Avoid excess soy and raw cruciferous vegetables if hypothyroid"]},
    "anemia":           {"r": "Anemia (low hemoglobin) causes fatigue, paleness, and breathlessness. Most common cause is iron deficiency. Eat iron-rich foods with vitamin C to enhance absorption. Avoid tea/coffee with meals. Vegetarians need to monitor B12 levels carefully.", "u": "medium", "t": ["Eat iron-rich foods: spinach, lentils, red meat, pomegranate", "Pair iron foods with vitamin C (lemon juice) to double absorption", "Avoid tea/coffee for 1 hour after meals", "Vegetarians: supplement B12 as plant foods don't provide enough"]},
    "yoga":             {"r": "Yoga combines physical postures, breathing, and meditation delivering benefits for flexibility, strength, stress reduction, and cardiovascular health. Surya Namaskar (12 poses) is a complete full-body workout. Pranayama (breathing exercises) reduces blood pressure significantly.", "u": "none", "t": ["Start with Surya Namaskar — 5-10 rounds is a complete workout", "Anulom Vilom pranayama for 10 min daily reduces stress and BP", "Yoga Nidra is excellent for insomnia and anxiety", "Consistency of 20 min daily beats 2-hour occasional sessions"]},
    "smoking":          {"r": "Smoking is the leading preventable cause of death, causing cancer, heart disease, stroke, and COPD. Every cigarette damages blood vessels and lungs. Quitting at ANY age provides immediate benefits. Nicotine replacement therapy doubles quit success rates.", "u": "high", "t": ["Set a specific quit date and tell someone to hold you accountable", "Nicotine patches or gum significantly improve success rates", "Identify and avoid your triggers — stress, coffee, alcohol", "The first 3 days are hardest — symptoms peak and then ease"]},
}

EMERGENCY_WORDS = ["emergency", "dying", "heart attack", "stroke", "unconscious",
                   "not breathing", "severe bleeding", "overdose", "fainted", "seizure", "collapse"]
GREETINGS      = ["hi", "hello", "hey", "good morning", "good evening", "namaste", "hii", "helo", "sup"]
THANKS         = ["thank", "thanks", "thank you", "thx", "tysm", "shukriya"]


def find_kb_match(text: str):
    text_l = text.lower()
    for kw in sorted(KB.keys(), key=len, reverse=True):
        if kw in text_l:
            return KB[kw]
    return None


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    health_score: Optional[float] = None
    user_profile: Optional[dict]  = None
    language: Optional[str] = "en"  # Language code for translation


def translate_text(text: str, target_language: str) -> str:
    """Translate text to target language using Groq API."""
    if not GROQ_API_KEY or target_language == "en" or not text or not text.strip():
        return text
    
    # Language name mapping
    language_names = {
        "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "mr": "Marathi", "ta": "Tamil",
        "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi", "or": "Odia",
        "as": "Assamese", "ur": "Urdu", "ne": "Nepali", "si": "Sinhala",
        "zh": "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)", "ja": "Japanese",
        "ko": "Korean", "vi": "Vietnamese", "th": "Thai", "id": "Indonesian", "ms": "Malay",
        "tl": "Filipino", "my": "Burmese", "km": "Khmer", "lo": "Lao",
        "ar": "Arabic", "fa": "Persian", "he": "Hebrew", "tr": "Turkish",
        "ru": "Russian", "uk": "Ukrainian", "pl": "Polish", "cs": "Czech", "sk": "Slovak",
        "hu": "Hungarian", "ro": "Romanian", "bg": "Bulgarian", "sr": "Serbian", "hr": "Croatian",
        "sl": "Slovenian", "el": "Greek", "de": "German", "fr": "French", "es": "Spanish",
        "pt": "Portuguese", "pt-BR": "Portuguese (Brazil)", "it": "Italian", "nl": "Dutch",
        "sv": "Swedish", "no": "Norwegian", "da": "Danish", "fi": "Finnish",
        "sw": "Swahili", "am": "Amharic", "ha": "Hausa", "yo": "Yoruba", "ig": "Igbo",
        "zu": "Zulu", "af": "Afrikaans", "so": "Somali",
    }
    
    lang_name = language_names.get(target_language, target_language)
    
    # Simplified prompt for cleaner translations
    translate_prompt = f"""Translate this text to {lang_name}. 
Rules:
1. Return ONLY the translated text, nothing else
2. Do NOT include ** or any markdown formatting
3. Keep emojis as they are
4. Keep numbers and measurements as they are
5. Translate naturally, not word-by-word

Text: {text}"""

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": f"You are a translator. Translate to {lang_name}. Return only the translation, no explanations, no markdown."},
            {"role": "user", "content": translate_prompt}
        ],
        "max_tokens": 1024,
        "temperature": 0.2,
    }

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    try:
        if HAS_REQUESTS:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                result = data["choices"][0]["message"]["content"]
                # Clean up any markdown that slipped through
                result = result.replace("**", "").strip()
                return result
        else:
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, timeout=30, context=ssl_context) as resp:
                data = json.loads(resp.read().decode())
                result = data["choices"][0]["message"]["content"]
                # Clean up any markdown that slipped through
                result = result.replace("**", "").strip()
                return result
    except Exception as e:
        print(f"Translation error: {e}")
    
    return text  # Return original if translation fails


# ── Translation Endpoint for Frontend ─────────────────────────────────────────
class TranslateRequest(BaseModel):
    text: str
    target_language: str
    
class TranslateBatchRequest(BaseModel):
    texts: List[str]
    target_language: str

@router.post("/translate")
def translate_endpoint(req: TranslateRequest):
    """Translate a single text to target language"""
    if req.target_language == "en" or not req.text or not req.text.strip():
        return {"translated": req.text, "language": req.target_language}
    
    translated = translate_text(req.text.strip(), req.target_language)
    # Clean any remaining markdown
    translated = translated.replace("**", "").strip()
    return {"translated": translated, "language": req.target_language}

@router.post("/translate-batch")
def translate_batch_endpoint(req: TranslateBatchRequest):
    """Translate multiple texts to target language"""
    if req.target_language == "en" or not req.texts:
        return {"translated": req.texts, "language": req.target_language}
    
    # Translate each text individually for better quality
    translated_list = []
    for text in req.texts:
        if text and text.strip():
            result = translate_text(text.strip(), req.target_language)
            result = result.replace("**", "").strip()
            translated_list.append(result)
        else:
            translated_list.append(text)
    
    return {"translated": translated_list, "language": req.target_language}


@router.post("/chat")
def chat(req: ChatRequest):
    target_lang = req.language or "en"
    msg   = req.message.strip()
    msg_l = msg.lower()

    # Helper function to translate response if needed
    def maybe_translate(response_text):
        if target_lang and target_lang != "en":
            return translate_text(response_text, target_lang)
        return response_text

    # ── Emergency — always highest priority ───────────────────────────────────
    if any(e in msg_l for e in EMERGENCY_WORDS):
        response_text = "🚨 **This sounds like a medical emergency!**\n\nPlease call **112** (India) or your local emergency number immediately. Do NOT wait — go to the nearest hospital right away."
        return {
            "response":    maybe_translate(response_text),
            "urgency":     "emergency",
            "tips":        [maybe_translate(t) for t in ["Call 112 immediately", "Don't drive yourself — call an ambulance", "Stay calm and stay with the person until help arrives"]],
            "disclaimer":  False,
            "powered_by":  "safety",
            "language":    target_lang,
        }

    # ── Greeting ──────────────────────────────────────────────────────────────
    if any(g in msg_l for g in GREETINGS) and len(msg.split()) <= 4:
        score = f" Your current health score is **{req.health_score:.0f}/100**." if req.health_score else ""
        response_text = f"Hello! 👋 I'm your LifeSet Health Assistant.{score}\n\nI can answer **any question** you have — health symptoms, diet, medicines, exercise, or even general knowledge. What would you like to know?"
        return {
            "response":   maybe_translate(response_text),
            "urgency":    "none",
            "tips":       [],
            "disclaimer": False,
            "powered_by": "system",
            "language":   target_lang,
        }

    # ── Thanks ────────────────────────────────────────────────────────────────
    if any(t in msg_l for t in THANKS):
        return {
            "response":   maybe_translate("You're welcome! 💚 Ask me anything anytime. I'm here to help!"),
            "urgency":    "none",
            "tips":       [],
            "disclaimer": False,
            "powered_by": "system",
            "language":   target_lang,
        }

    # ── Serious disease detection — gentle tone override ─────────────────────
    serious = _detect_serious_disease(msg)
    if not serious and req.user_profile:
        serious = _detect_serious_disease(str(req.user_profile.get("medical_history") or ""))

    # ── Try Gemini API ────────────────────────────────────────────────────────
    history_dicts = [{"role": h.role, "content": h.content} for h in req.history]

    if serious and not GROQ_API_KEY:
        response_text = (
            "I can hear that you or someone you care about is dealing with something really difficult. "
            "Please know that you are not alone in this — many people navigate serious health challenges "
            "every day and go on to live meaningful, fulfilling lives with the right care and support.\n\n"
            "The most important step right now is to **consult your doctor or a specialist as soon as possible**. "
            "They will create a personalized care plan just for you and guide you through every step. "
            "Modern medicine has made tremendous progress, and your medical team is your greatest ally.\n\n"
            "💚 Is there anything specific I can help you understand or prepare for your doctor visit?"
        )
        tips = [
            "Consult your doctor or specialist immediately",
            "Bring all your reports and test results to the appointment",
            "Write down your questions for the doctor beforehand",
            "Bring a trusted family member or friend for support",
        ]
        return {
            "response":   maybe_translate(response_text),
            "urgency":    "high",
            "tips":       [maybe_translate(t) for t in tips],
            "disclaimer": True,
            "powered_by": "system",
            "language":   target_lang,
        }

    # ── Try Groq API first (if configured) ──────────────────────────────────
    api_reply = call_groq_api(msg, history_dicts, req.user_profile)

    if api_reply:
        return {
            "response":   maybe_translate(api_reply),
            "urgency":    "high" if serious else "none",
            "tips":       [maybe_translate("Please consult your doctor or specialist immediately")] if serious else [],
            "disclaimer": False,
            "powered_by": "groq-ai",
            "language":   target_lang,
        }
    
    # ── Try HuggingFace API (if configured) ───────────────────────────────────
    hf_reply = call_huggingface_api(msg, history_dicts, req.user_profile)
    
    if hf_reply:
        return {
            "response":   maybe_translate(hf_reply),
            "urgency":    "high" if serious else "none",
            "tips":       [maybe_translate("Please consult your doctor or specialist immediately")] if serious else [],
            "disclaimer": False,
            "powered_by": "huggingface-ai",
            "language":   target_lang,
        }

    # ── Fallback: built-in KB ─────────────────────────────────────────────────
    match = find_kb_match(msg)
    if match:
        return {
            "response":   maybe_translate(match["r"]),
            "urgency":    match["u"],
            "tips":       [maybe_translate(t) for t in match["t"]],
            "disclaimer": True,
            "powered_by": "kb",
            "language":   target_lang,
        }

    # ── Smart response generator (works without API) ──────────────────────────
    smart_reply = generate_smart_response(msg, req.user_profile)
    return {
        "response":   maybe_translate(smart_reply),
        "urgency":    "none",
        "tips":       [],
        "disclaimer": True,
        "powered_by": "smart-kb",
        "language":   target_lang,
    }
