from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from database import get_db
from services.report_analyzer import analyze_report
import os, json, shutil

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_report(
    user_id: int = Form(...),
    report_type: str = Form("general"),
    file: UploadFile = File(...)
):
    allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed:
        raise HTTPException(400, "Only PDF and image files are allowed")

    filename = f"report_{user_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Analyze
    analysis = analyze_report(file_path, file.content_type)

    conn = get_db()
    c = conn.cursor()
    c.execute("""
        INSERT INTO reports (user_id, filename, file_path, report_type, analysis_result, abnormal_values)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        user_id, file.filename, file_path, report_type,
        json.dumps(analysis),
        json.dumps(analysis["abnormal"])
    ))
    report_id = c.lastrowid

    # Alert if abnormal values found
    if analysis["abnormal"]:
        c.execute("""
            INSERT INTO alerts (user_id, alert_type, message, severity)
            VALUES (?, ?, ?, ?)
        """, (user_id, "report_abnormal",
              f"Abnormal values detected in your report: {', '.join(analysis['abnormal'].keys())}",
              "warning"))
    conn.commit()
    conn.close()

    return {"report_id": report_id, "analysis": analysis}

@router.get("/list/{user_id}")
def list_reports(user_id: int):
    conn = get_db()
    reports = conn.execute(
        "SELECT id, filename, report_type, analysis_result, abnormal_values, uploaded_at FROM reports WHERE user_id=? ORDER BY uploaded_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    result = []
    for r in reports:
        d = dict(r)
        try:
            d["analysis_result"] = json.loads(d["analysis_result"] or "{}")
            d["abnormal_values"] = json.loads(d["abnormal_values"] or "{}")
        except:
            pass
        result.append(d)
    return result

@router.get("/{report_id}")
def get_report(report_id: int):
    conn = get_db()
    report = conn.execute("SELECT * FROM reports WHERE id=?", (report_id,)).fetchone()
    conn.close()
    if not report:
        raise HTTPException(404, "Report not found")
    d = dict(report)
    try:
        d["analysis_result"] = json.loads(d["analysis_result"] or "{}")
        d["abnormal_values"] = json.loads(d["abnormal_values"] or "{}")
    except:
        pass
    return d
