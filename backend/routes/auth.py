from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import hashlib, json, time, base64, random, string, os, uuid, re
from database import get_db
from services.otp_service import send_otp_email

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "certificates")
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

def verify_certificate(file_path: str, license_number: str, name: str) -> dict:
    """
    Verify doctor certificate using basic validation.
    In production, this would integrate with medical council APIs.
    """
    try:
        # Get file extension
        ext = os.path.splitext(file_path)[1].lower()
        
        # Check if file exists and has valid extension
        if not os.path.exists(file_path):
            return {"verified": False, "status": "rejected", "notes": "Certificate file not found"}
        
        # Check file size (should be between 10KB and 10MB)
        file_size = os.path.getsize(file_path)
        if file_size < 10 * 1024:  # Less than 10KB
            return {"verified": False, "status": "rejected", "notes": "Certificate file too small - may be invalid"}
        if file_size > 10 * 1024 * 1024:  # More than 10MB
            return {"verified": False, "status": "rejected", "notes": "Certificate file too large"}
        
        # Check valid image/pdf formats
        valid_extensions = ['.jpg', '.jpeg', '.png', '.pdf']
        if ext not in valid_extensions:
            return {"verified": False, "status": "rejected", "notes": f"Invalid file format. Accepted: {', '.join(valid_extensions)}"}
        
        # Validate license number format (basic check)
        # Indian Medical Council format: MCI-XXXXX or state codes like MH-XXXXX, DL-XXXXX
        license_pattern = r'^[A-Z]{2,3}-?\d{4,10}$'
        if not re.match(license_pattern, license_number.upper().replace(' ', '')):
            return {"verified": False, "status": "rejected", "notes": "Invalid license number format. Expected format: MCI-XXXXX or STATE-XXXXX"}
        
        # If all basic checks pass, mark as verified
        # In production, you would:
        # 1. Use OCR to extract text from certificate
        # 2. Verify against medical council database
        # 3. Cross-check name and license number
        return {
            "verified": True, 
            "status": "verified", 
            "notes": f"Certificate verified for license {license_number}"
        }
        
    except Exception as e:
        return {"verified": False, "status": "error", "notes": f"Verification error: {str(e)}"}

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "patient"
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital_affiliation: Optional[str] = None
    # New doctor fields
    college_name: Optional[str] = None
    graduation_year: Optional[int] = None
    years_of_practice: Optional[int] = None

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
                               college_name, graduation_year, years_of_practice,
                               otp_code, otp_expiry, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (req.name, req.email, req.phone, hash_password(req.password),
              req.role, req.specialization, req.license_number,
              req.hospital_affiliation, req.college_name, req.graduation_year,
              req.years_of_practice, otp, otp_expiry))

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

@router.post("/register-doctor")
async def register_doctor(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: str = Form(None),
    specialization: str = Form(...),
    license_number: str = Form(...),
    hospital_affiliation: str = Form(...),
    college_name: str = Form(...),
    graduation_year: int = Form(...),
    years_of_practice: int = Form(...),
    certificate: UploadFile = File(...)
):
    """Register a doctor with certificate verification"""
    
    # Validate all required fields
    if not all([name, email, password, specialization, license_number, 
                hospital_affiliation, college_name, graduation_year, years_of_practice]):
        raise HTTPException(400, "All fields are mandatory for doctor registration")
    
    # Validate graduation year
    current_year = time.localtime().tm_year
    if graduation_year < 1950 or graduation_year > current_year:
        raise HTTPException(400, f"Invalid graduation year. Must be between 1950 and {current_year}")
    
    # Validate years of practice
    max_practice_years = current_year - graduation_year
    if years_of_practice < 0 or years_of_practice > max_practice_years:
        raise HTTPException(400, f"Years of practice cannot exceed {max_practice_years} years since graduation")
    
    # Check if email already exists
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(400, "Email already registered. Please login instead.")
    conn.close()
    
    # Save certificate file
    file_ext = os.path.splitext(certificate.filename)[1].lower()
    if file_ext not in ['.jpg', '.jpeg', '.png', '.pdf']:
        raise HTTPException(400, "Certificate must be JPG, PNG, or PDF format")
    
    unique_filename = f"cert_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        contents = await certificate.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(500, f"Failed to save certificate: {str(e)}")
    
    # Verify certificate
    verification = verify_certificate(file_path, license_number, name)
    
    if not verification["verified"]:
        # Delete the uploaded file if verification failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(400, f"Certificate verification failed: {verification['notes']}")
    
    # Certificate verified - create user
    conn = get_db()
    c = conn.cursor()
    try:
        otp = gen_otp()
        otp_expiry = time.time() + 600
        
        c.execute("""
            INSERT INTO users (name, email, phone, password_hash, role,
                               specialization, license_number, hospital_affiliation,
                               college_name, graduation_year, years_of_practice,
                               certificate_path, certificate_verified, verification_status, verification_notes,
                               otp_code, otp_expiry, is_verified)
            VALUES (?, ?, ?, ?, 'doctor', ?, ?, ?, ?, ?, ?, ?, 1, 'verified', ?, ?, ?, 0)
        """, (name, email, phone, hash_password(password),
              specialization, license_number, hospital_affiliation,
              college_name, graduation_year, years_of_practice,
              file_path, verification["notes"], otp, otp_expiry))
        
        user_id = c.lastrowid
        c.execute("INSERT INTO health_profiles (user_id) VALUES (?)", (user_id,))
        c.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, 'welcome', ?, 'info')
        """, (user_id, "Welcome to LifeSet, Doctor! Your certificate has been verified."))
        conn.commit()
        
        # Send OTP
        try:
            send_otp_email(email, otp, name)
            return {
                "token": make_token(user_id, email, "doctor"),
                "user_id": user_id,
                "name": name,
                "email": email,
                "role": "doctor",
                "is_verified": False,
                "email_sent": True,
                "certificate_verified": True,
                "verification_notes": verification["notes"]
            }
        except Exception as e:
            # Delete user if email failed
            c.execute("DELETE FROM users WHERE id=?", (user_id,))
            c.execute("DELETE FROM health_profiles WHERE user_id=?", (user_id,))
            c.execute("DELETE FROM alerts WHERE user_id=?", (user_id,))
            conn.commit()
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(400, f"Could not send OTP email: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
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
