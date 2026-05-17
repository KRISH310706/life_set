from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import hashlib, json, time, base64, random, string
from database import get_db
from services.otp_service import send_otp_email

router = APIRouter()

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def make_token(user_id: int, email: str, role: str) -> str:
    payload = json.dumps({"user_id": user_id, "email": email, "role": role, "ts": int(time.time())})
    return base64.b64encode(payload.encode()).decode()

def decode_token(token: str) -> Optional[dict]:
    try:
        return json.loads(base64.b64decode(token.encode()).decode())
    except:
        return None

def gen_otp():
    return ''.join(random.choices(string.digits, k=6))

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "patient"
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital_affiliation: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class UpdateProfileRequest(BaseModel):
    user_id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    specialization: Optional[str] = None
    hospital_affiliation: Optional[str] = None

@router.post("/register")
def register(req: RegisterRequest):
    conn = get_db()
    c = conn.cursor()
    try:
        otp = gen_otp()
        otp_expiry = time.time() + 600

        c.execute("""
            INSERT INTO users (name, email, phone, password_hash, role,
                               specialization, license_number, hospital_affiliation,
                               otp_code, otp_expiry, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (req.name, req.email, req.phone, hash_password(req.password),
              req.role, req.specialization, req.license_number,
              req.hospital_affiliation, otp, otp_expiry))

        user_id = c.lastrowid
        c.execute("INSERT INTO health_profiles (user_id) VALUES (?)", (user_id,))
        c.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, 'welcome', ?, 'info')
        """, (user_id, f"Welcome to LifeSet! Complete your health profile to get started."))
        conn.commit()

        # Send OTP — raises exception if email not configured
        try:
            send_otp_email(req.email, otp, req.name)
            return {
                "token":       make_token(user_id, req.email, req.role),
                "user_id":     user_id,
                "name":        req.name,
                "email":       req.email,
                "role":        req.role,
                "is_verified": False,
                "email_sent":  True,
            }
        except Exception as e:
            # Delete the user since email failed
            c.execute("DELETE FROM users WHERE id=?", (user_id,))
            c.execute("DELETE FROM health_profiles WHERE user_id=?", (user_id,))
            c.execute("DELETE FROM alerts WHERE user_id=?", (user_id,))
            conn.commit()
            raise HTTPException(
                400,
                f"Could not send OTP email: {str(e)}. "
                "Please configure email in lifeset/backend/config.py"
            )

    except HTTPException:
        raise
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(400, "Email already registered. Please login instead.")
        raise HTTPException(400, str(e))
    finally:
        conn.close()

@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    conn = get_db()
    c = conn.cursor()
    user = c.execute("SELECT * FROM users WHERE email=?", (req.email,)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(404, "User not found")
    if str(user["otp_code"]) != str(req.otp).strip():
        raise HTTPException(400, "Incorrect OTP. Please check your email and try again.")
    if time.time() > (user["otp_expiry"] or 0):
        raise HTTPException(400, "OTP has expired. Click Resend OTP to get a new one.")
    conn = get_db()
    conn.execute("UPDATE users SET is_verified=1, otp_code=NULL WHERE email=?", (req.email,))
    conn.commit()
    conn.close()
    return {"message": "Email verified! Welcome to LifeSet 🎉", "verified": True}

@router.post("/resend-otp")
def resend_otp(email: str):
    conn = get_db()
    user = conn.execute("SELECT name FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(404, "Email not found")
    otp = gen_otp()
    conn.execute("UPDATE users SET otp_code=?, otp_expiry=? WHERE email=?",
                 (otp, time.time() + 600, email))
    conn.commit()
    conn.close()
    try:
        send_otp_email(email, otp, user["name"])
        return {"message": "New OTP sent to your email!", "email_sent": True}
    except Exception as e:
        raise HTTPException(400, f"Failed to send OTP: {str(e)}")

@router.post("/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email=? AND password_hash=?",
        (req.email, hash_password(req.password))
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user["id"], user["email"], user["role"])
    return {
        "token":       token,
        "user_id":     user["id"],
        "name":        user["name"],
        "email":       user["email"],
        "role":        user["role"],
        "is_verified": bool(user["is_verified"]),
    }

@router.get("/me")
def me(token: str):
    data = decode_token(token)
    if not data:
        raise HTTPException(401, "Invalid token")
    conn = get_db()
    user = conn.execute(
        "SELECT id,name,email,phone,role,specialization,hospital_affiliation,bio,is_verified,created_at FROM users WHERE id=?",
        (data["user_id"],)
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(404, "User not found")
    return dict(user)

@router.put("/profile")
def update_profile(req: UpdateProfileRequest):
    conn = get_db()
    fields, vals = [], []
    for k, v in req.dict().items():
        if k != "user_id" and v is not None:
            fields.append(f"{k}=?"); vals.append(v)
    if fields:
        vals.append(req.user_id)
        conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id=?", vals)
        conn.commit()
    conn.close()
    return {"message": "Profile updated"}

@router.get("/search")
def search_users(query: str, role: Optional[str] = None):
    conn = get_db()
    q = f"%{query}%"
    if role:
        users = conn.execute(
            "SELECT id,name,email,phone,role,specialization,hospital_affiliation,is_verified FROM users WHERE role=? AND (phone LIKE ? OR email LIKE ? OR name LIKE ?)",
            (role, q, q, q)
        ).fetchall()
    else:
        users = conn.execute(
            "SELECT id,name,email,phone,role,specialization,hospital_affiliation,is_verified FROM users WHERE phone LIKE ? OR email LIKE ? OR name LIKE ?",
            (q, q, q)
        ).fetchall()
    conn.close()
    return [dict(u) for u in users]

@router.get("/doctors")
def list_doctors():
    conn = get_db()
    doctors = conn.execute(
        "SELECT id,name,email,phone,specialization,hospital_affiliation,bio,is_verified FROM users WHERE role='doctor'"
    ).fetchall()
    result = []
    for d in doctors:
        doc = dict(d)
        rating = conn.execute(
            "SELECT AVG(stars) as avg, COUNT(*) as cnt FROM ratings WHERE doctor_id=?", (d["id"],)
        ).fetchone()
        doc["avg_rating"]   = round(rating["avg"] or 0, 1)
        doc["review_count"] = rating["cnt"]
        result.append(doc)
    conn.close()
    return result

@router.get("/patients")
def list_patients():
    conn = get_db()
    patients = conn.execute(
        "SELECT id,name,email,phone,is_verified FROM users WHERE role='patient'"
    ).fetchall()
    conn.close()
    return [dict(p) for p in patients]
