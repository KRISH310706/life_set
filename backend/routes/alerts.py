from fastapi import APIRouter
from database import get_db

router = APIRouter()

@router.get("/{user_id}")
def get_alerts(user_id: int):
    conn = get_db()
    alerts = conn.execute(
        "SELECT * FROM alerts WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(a) for a in alerts]

@router.put("/read/{alert_id}")
def mark_read(alert_id: int):
    conn = get_db()
    conn.execute("UPDATE alerts SET is_read=1 WHERE id=?", (alert_id,))
    conn.commit()
    conn.close()
    return {"message": "Marked as read"}

@router.put("/read-all/{user_id}")
def mark_all_read(user_id: int):
    conn = get_db()
    conn.execute("UPDATE alerts SET is_read=1 WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "All marked as read"}
