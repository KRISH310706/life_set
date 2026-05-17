"""
LifeSet Life Print — Clinical Handoff Summary
GET /api/life-print/summary/{subject_id}
"""
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from services.prediction_engine import calculate_risks
from services.recommendation_engine import get_recommendations
from datetime import datetime
import json

router = APIRouter()


def _summarize_report(r: dict) -> dict:
    """Parse and summarise a single report row for Life Print."""
    analysis = {}
    abnormal = {}
    try:
        analysis = json.loads(r.get("analysis_result") or "{}")
    except Exception:
        pass
    try:
        abnormal = json.loads(r.get("abnormal_values") or "{}")
    except Exception:
        pass

    # Abnormal count
    abnormal_count = 0
    if isinstance(analysis, dict):
        abnormal_count = analysis.get("abnormal_count", len(abnormal) if isinstance(abnormal, dict) else 0)
    else:
        abnormal_count = len(abnormal) if isinstance(abnormal, dict) else 0

    # Highlight lines
    highlights = []
    condition_summary = analysis.get("condition_summary", []) if isinstance(analysis, dict) else []
    if condition_summary:
        for cs in condition_summary[:2]:
            if isinstance(cs, dict):
                highlights.append(f"{cs.get('condition', '')}: {cs.get('verdict', '')}")
    elif isinstance(abnormal, dict):
        for k in list(abnormal.keys())[:2]:
            entry = abnormal[k]
            if isinstance(entry, dict):
                highlights.append(f"{entry.get('label', k)}: {entry.get('range_name', '')}")

    return {
        "id":            r.get("id"),
        "filename":      r.get("filename"),
        "report_type":   r.get("report_type"),
        "uploaded_at":   r.get("uploaded_at"),
        "abnormal_count": abnormal_count,
        "highlights":    highlights,
        "summary":       analysis.get("summary", "") if isinstance(analysis, dict) else "",
        "analysis":      analysis,
        "abnormal":      abnormal,
    }


@router.get("/summary/{subject_id}")
def get_life_print_summary(
    subject_id: int,
    requester_id: int = Query(...),
    requester_role: str = Query("patient"),
):
    conn = get_db()

    # ── Access control ────────────────────────────────────────────────────────
    if requester_role == "patient":
        if requester_id != subject_id:
            conn.close()
            raise HTTPException(403, "Patients can only view their own Life Print.")
    elif requester_role == "doctor":
        if requester_id != subject_id:
            access = conn.execute(
                "SELECT status FROM access_requests WHERE doctor_id=? AND patient_id=?",
                (requester_id, subject_id),
            ).fetchone()
            if not access or access["status"] != "accepted":
                conn.close()
                raise HTTPException(403, "Access not granted. The patient must approve your access request first.")

    # ── Subject info ──────────────────────────────────────────────────────────
    subject = conn.execute(
        "SELECT id, name, email, phone, role, specialization, hospital_affiliation, bio, age, gender, is_verified "
        "FROM users WHERE id=?",
        (subject_id,),
    ).fetchone()
    if not subject:
        conn.close()
        raise HTTPException(404, "User not found.")
    subject = dict(subject)

    # ── Health profile ────────────────────────────────────────────────────────
    profile_row = conn.execute(
        "SELECT * FROM health_profiles WHERE user_id=?", (subject_id,)
    ).fetchone()
    profile = dict(profile_row) if profile_row else {}

    # ── Risks & recommendations ───────────────────────────────────────────────
    risks = calculate_risks(profile) if profile else {"heart": 0, "diabetes": 0, "stroke": 0, "hypertension": 0, "bmi": 22}
    recommendations = get_recommendations(profile, risks) if profile else {}

    # ── Risk history (latest 8) ───────────────────────────────────────────────
    risk_history_rows = conn.execute(
        "SELECT * FROM risk_history WHERE user_id=? ORDER BY calculated_at DESC LIMIT 8",
        (subject_id,),
    ).fetchall()
    risk_history = [dict(r) for r in risk_history_rows]

    # ── Reports (latest 5, summarised) ───────────────────────────────────────
    report_rows = conn.execute(
        "SELECT id, filename, report_type, analysis_result, abnormal_values, uploaded_at "
        "FROM reports WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 5",
        (subject_id,),
    ).fetchall()
    reports = [_summarize_report(dict(r)) for r in report_rows]

    # ── Alerts (latest 5) ────────────────────────────────────────────────────
    alert_rows = conn.execute(
        "SELECT * FROM alerts WHERE user_id=? ORDER BY created_at DESC LIMIT 5",
        (subject_id,),
    ).fetchall()
    alerts = [dict(a) for a in alert_rows]

    # ── Access summary ────────────────────────────────────────────────────────
    if requester_role == "doctor" and requester_id != subject_id:
        access_rows = conn.execute(
            """SELECT ar.*, u.name AS doctor_name, u.specialization, u.hospital_affiliation
               FROM access_requests ar JOIN users u ON u.id = ar.doctor_id
               WHERE ar.doctor_id=? AND ar.patient_id=? AND ar.status='accepted'""",
            (requester_id, subject_id),
        ).fetchall()
    else:
        access_rows = conn.execute(
            """SELECT ar.*, u.name AS doctor_name, u.specialization, u.hospital_affiliation
               FROM access_requests ar JOIN users u ON u.id = ar.doctor_id
               WHERE ar.patient_id=? AND ar.status='accepted'
               ORDER BY ar.created_at DESC LIMIT 5""",
            (subject_id,),
        ).fetchall()
    access_summary = [dict(a) for a in access_rows]

    conn.close()

    # ── Derived fields ────────────────────────────────────────────────────────
    habits = {
        "smoking":      "Yes" if profile.get("smoking") else "No",
        "alcohol":      "Yes" if profile.get("alcohol") else "No",
        "exercise_freq": profile.get("exercise_freq") or "Not recorded",
        "diet_type":    profile.get("diet_type") or "Not recorded",
        "sleep":        profile.get("sleep") or "Not recorded",
    }

    summary_lines = []
    for field in ("medical_history", "symptoms", "family_history"):
        val = profile.get(field, "").strip() if profile.get(field) else ""
        if val:
            summary_lines.append({"field": field.replace("_", " ").title(), "value": val})

    return {
        "subject":        subject,
        "profile":        profile,
        "risks":          risks,
        "recommendations": recommendations,
        "risk_history":   risk_history,
        "reports":        reports,
        "alerts":         alerts,
        "access_summary": access_summary,
        "habits":         habits,
        "summary_lines":  summary_lines,
        "generated_at":   datetime.utcnow().isoformat() + "Z",
    }
