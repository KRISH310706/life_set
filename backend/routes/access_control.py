"""
LifeSet Access Control
- PATIENT goes to doctor profile and grants access
- DOCTOR receives notification and can accept/decline
- If accepted: DOCTOR can VIEW (read-only) patient data
- Both can revoke access anytime
- Doctor can NEVER edit patient data
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
from database import get_db

router = APIRouter()

class AccessRequestCreate(BaseModel):
    doctor_id:  int
    patient_id: int
    message:    Optional[str] = None
    initiated_by: Optional[str] = "patient"  # "patient" or "doctor"

class AccessResponse(BaseModel):
    request_id: int
    status:     str   # "accepted" | "rejected"

# ── Send access request (can be initiated by patient OR doctor) ──────────────
@router.post("/request")
def send_request(req: AccessRequestCreate):
    conn = get_db()

    # Verify doctor exists
    doctor = conn.execute("SELECT role, name FROM users WHERE id=?", (req.doctor_id,)).fetchone()
    if not doctor or doctor["role"] != "doctor":
        conn.close()
        raise HTTPException(404, "Doctor not found")

    # Verify patient exists
    patient = conn.execute("SELECT name FROM users WHERE id=? AND role='patient'", (req.patient_id,)).fetchone()
    if not patient:
        conn.close()
        raise HTTPException(404, "Patient not found")

    # Check if request already exists
    existing = conn.execute(
        "SELECT id, status FROM access_requests WHERE doctor_id=? AND patient_id=?",
        (req.doctor_id, req.patient_id)
    ).fetchone()

    if existing:
        if existing["status"] == "accepted":
            conn.close()
            raise HTTPException(400, "Access is already granted")
        elif existing["status"] == "pending":
            conn.close()
            raise HTTPException(400, "A request is already pending")
        else:
            # If rejected/revoked, delete old request and create new one
            conn.execute("DELETE FROM access_requests WHERE id=?", (existing["id"],))

    try:
        # Determine who initiated and set appropriate message
        if req.initiated_by == "patient":
            default_msg = f"{patient['name']} wants to grant you access to their health records."
            notify_user_id = req.doctor_id
            alert_msg = f"Patient {patient['name']} wants to grant you access to their health records. Go to Access Requests to accept."
        else:
            default_msg = f"Dr. {doctor['name']} is requesting access to your health records to provide better care."
            notify_user_id = req.patient_id
            alert_msg = f"Dr. {doctor['name']} has requested access to your health records. Go to Access Requests to approve or decline."

        conn.execute("""
            INSERT INTO access_requests (doctor_id, patient_id, message, initiated_by)
            VALUES (?, ?, ?, ?)
        """, (req.doctor_id, req.patient_id, req.message or default_msg, req.initiated_by or "patient"))

        # Notify the appropriate user
        conn.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, 'access_request', ?, 'info')
        """, (notify_user_id, alert_msg))
        
        conn.commit()
        return {"message": "Access request sent successfully"}

    except Exception as e:
        conn.close()
        raise HTTPException(400, str(e))
    finally:
        conn.close()

# ── Get requests (for patient: requests received; for doctor: requests sent) ──
@router.get("/my-requests/{user_id}")
def get_my_requests(user_id: int, role: str = "patient"):
    conn = get_db()

    if role == "patient":
        # Patient sees requests from doctors AND requests they initiated
        rows = conn.execute("""
            SELECT ar.id, ar.doctor_id, ar.patient_id, ar.status, ar.message, 
                   ar.initiated_by, ar.created_at, ar.responded_at,
                   u.name  AS doctor_name,
                   u.email AS doctor_email,
                   u.specialization,
                   u.hospital_affiliation,
                   u.phone AS doctor_phone
            FROM access_requests ar
            JOIN users u ON u.id = ar.doctor_id
            WHERE ar.patient_id = ?
            ORDER BY ar.created_at DESC
        """, (user_id,)).fetchall()
    else:
        # Doctor sees all requests (both sent by them and received from patients)
        rows = conn.execute("""
            SELECT ar.id, ar.doctor_id, ar.patient_id, ar.status, ar.message,
                   ar.initiated_by, ar.created_at, ar.responded_at,
                   u.name  AS patient_name,
                   u.email AS patient_email,
                   u.phone AS patient_phone
            FROM access_requests ar
            JOIN users u ON u.id = ar.patient_id
            WHERE ar.doctor_id = ?
            ORDER BY ar.created_at DESC
        """, (user_id,)).fetchall()

    conn.close()
    return [dict(r) for r in rows]

# ── Respond to a request (accept/reject) ─────────────────────────────────────
@router.put("/respond")
def respond(req: AccessResponse):
    if req.status not in ("accepted", "rejected"):
        raise HTTPException(400, "Status must be 'accepted' or 'rejected'")

    conn = get_db()
    row  = conn.execute(
        "SELECT * FROM access_requests WHERE id=?", (req.request_id,)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(404, "Request not found")

    # Convert row to dict for easier access
    row_dict = dict(row)

    conn.execute("""
        UPDATE access_requests
        SET status=?, responded_at=CURRENT_TIMESTAMP
        WHERE id=?
    """, (req.status, req.request_id))

    # Get names for notification
    doctor = conn.execute("SELECT name FROM users WHERE id=?", (row_dict["doctor_id"],)).fetchone()
    patient = conn.execute("SELECT name FROM users WHERE id=?", (row_dict["patient_id"],)).fetchone()

    # Notify based on who initiated
    initiated_by = row_dict.get("initiated_by") or "patient"
    
    if initiated_by == "patient":
        # Patient initiated, doctor responded - notify patient
        word = "accepted ✅" if req.status == "accepted" else "declined ❌"
        conn.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, 'access_response', ?, ?)
        """, (
            row_dict["patient_id"],
            f"Dr. {doctor['name']} has {word} your access grant request." + 
            (" They can now view your health records." if req.status == "accepted" else ""),
            "success" if req.status == "accepted" else "info"
        ))
    else:
        # Doctor initiated, patient responded - notify doctor
        word = "approved ✅" if req.status == "accepted" else "declined ❌"
        conn.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, 'access_response', ?, ?)
        """, (
            row_dict["doctor_id"],
            f"Patient {patient['name']} has {word} your access request." +
            (" You can now view their health records." if req.status == "accepted" else ""),
            "success" if req.status == "accepted" else "info"
        ))

    conn.commit()
    conn.close()
    return {"message": f"Request {req.status}"}

# ── Check if doctor has access to patient ────────────────────────────────────
@router.get("/check/{doctor_id}/{patient_id}")
def check_access(doctor_id: int, patient_id: int):
    conn = get_db()
    row  = conn.execute(
        "SELECT status, initiated_by FROM access_requests WHERE doctor_id=? AND patient_id=?",
        (doctor_id, patient_id)
    ).fetchone()
    conn.close()
    return {
        "has_access": row is not None and row["status"] == "accepted",
        "status":     row["status"] if row else "none",
        "initiated_by": row["initiated_by"] if row else None
    }

# ── Doctor reads patient data (READ-ONLY, access must be approved) ────────────
@router.get("/patient-data/{patient_id}")
def get_patient_data(patient_id: int, doctor_id: int):
    conn = get_db()

    # Verify access is granted
    access = conn.execute(
        "SELECT status FROM access_requests WHERE doctor_id=? AND patient_id=?",
        (doctor_id, patient_id)
    ).fetchone()

    if not access or access["status"] != "accepted":
        conn.close()
        raise HTTPException(
            403,
            "Access not granted. The patient must approve your access request first."
        )

    # Fetch all patient data — READ ONLY
    patient = conn.execute(
        "SELECT id, name, email, age, gender FROM users WHERE id=?",
        (patient_id,)
    ).fetchone()

    profile = conn.execute(
        "SELECT * FROM health_profiles WHERE user_id=?",
        (patient_id,)
    ).fetchone()

    risks = conn.execute(
        "SELECT * FROM risk_history WHERE user_id=? ORDER BY calculated_at DESC LIMIT 5",
        (patient_id,)
    ).fetchall()

    reports = conn.execute(
        "SELECT id, filename, report_type, analysis_result, abnormal_values, uploaded_at "
        "FROM reports WHERE user_id=? ORDER BY uploaded_at DESC",
        (patient_id,)
    ).fetchall()

    conn.close()

    reports_list = []
    for r in reports:
        d = dict(r)
        try:    d["analysis_result"] = json.loads(d["analysis_result"] or "{}")
        except: pass
        try:    d["abnormal_values"] = json.loads(d["abnormal_values"] or "{}")
        except: pass
        reports_list.append(d)

    return {
        "patient":      dict(patient) if patient else {},
        "profile":      dict(profile) if profile else {},
        "risk_history": [dict(r) for r in risks],
        "reports":      reports_list,
        "access_note":  "This data is read-only. You cannot edit the patient's records.",
    }

# ── Revoke access (can be done by patient OR doctor) ─────────────────────────
@router.put("/revoke/{request_id}")
def revoke_access(request_id: int, user_id: int):
    conn = get_db()
    row  = conn.execute(
        "SELECT * FROM access_requests WHERE id=?", (request_id,)
    ).fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(404, "Request not found")
    
    # Either patient or doctor can revoke
    if row["patient_id"] != user_id and row["doctor_id"] != user_id:
        conn.close()
        raise HTTPException(403, "You don't have permission to revoke this access")
    
    conn.execute(
        "UPDATE access_requests SET status='revoked', responded_at=CURRENT_TIMESTAMP WHERE id=?",
        (request_id,)
    )
    
    # Get names for notification
    doctor = conn.execute("SELECT name FROM users WHERE id=?", (row["doctor_id"],)).fetchone()
    patient = conn.execute("SELECT name FROM users WHERE id=?", (row["patient_id"],)).fetchone()
    
    # Notify the other party
    if row["patient_id"] == user_id:
        # Patient revoked - notify doctor
        conn.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, 'access_revoked', ?, 'warning')
        """, (row["doctor_id"], f"Patient {patient['name']} has revoked your access to their health records."))
    else:
        # Doctor revoked - notify patient
        conn.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, 'access_revoked', ?, 'info')
        """, (row["patient_id"], f"Dr. {doctor['name']} has removed themselves from your connected doctors."))
    
    conn.commit()
    conn.close()
    return {"message": "Access revoked successfully"}

# ── Get all doctors with accepted access (for patient profile page) ───────────
@router.get("/my-doctors/{patient_id}")
def get_my_doctors(patient_id: int):
    conn = get_db()
    rows = conn.execute("""
        SELECT ar.id as request_id, ar.status, ar.created_at,
               u.id as doctor_id, u.name, u.specialization, u.hospital_affiliation, u.email
        FROM access_requests ar
        JOIN users u ON u.id = ar.doctor_id
        WHERE ar.patient_id=? AND ar.status='accepted'
        ORDER BY ar.created_at DESC
    """, (patient_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Get all patients with accepted access (for doctor profile page) ───────────
@router.get("/my-patients/{doctor_id}")
def get_my_patients(doctor_id: int):
    conn = get_db()
    rows = conn.execute("""
        SELECT ar.id as request_id, ar.status, ar.created_at,
               u.id as patient_id, u.name, u.email, u.phone
        FROM access_requests ar
        JOIN users u ON u.id = ar.patient_id
        WHERE ar.doctor_id=? AND ar.status='accepted'
        ORDER BY ar.created_at DESC
    """, (doctor_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]
