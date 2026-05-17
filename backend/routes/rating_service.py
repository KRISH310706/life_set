from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db

router = APIRouter()

class RatingCreate(BaseModel):
    doctor_id: int
    patient_id: int
    stars: int
    review: Optional[str] = None

@router.post("/rate")
def rate_doctor(req: RatingCreate):
    if not 1 <= req.stars <= 5:
        raise HTTPException(400, "Stars must be between 1 and 5")
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO ratings (doctor_id, patient_id, stars, review)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(doctor_id, patient_id) DO UPDATE SET
                stars=excluded.stars, review=excluded.review,
                created_at=CURRENT_TIMESTAMP
        """, (req.doctor_id, req.patient_id, req.stars, req.review))
        conn.commit()
        return {"message": "Rating submitted"}
    finally:
        conn.close()

@router.get("/doctor/{doctor_id}")
def get_doctor_ratings(doctor_id: int):
    conn = get_db()
    summary = conn.execute("""
        SELECT AVG(stars) as avg_rating, COUNT(*) as total_reviews,
               SUM(CASE WHEN stars=5 THEN 1 ELSE 0 END) as five_star,
               SUM(CASE WHEN stars=4 THEN 1 ELSE 0 END) as four_star,
               SUM(CASE WHEN stars=3 THEN 1 ELSE 0 END) as three_star,
               SUM(CASE WHEN stars=2 THEN 1 ELSE 0 END) as two_star,
               SUM(CASE WHEN stars=1 THEN 1 ELSE 0 END) as one_star
        FROM ratings WHERE doctor_id=?
    """, (doctor_id,)).fetchone()
    reviews = conn.execute("""
        SELECT r.*, u.name as patient_name
        FROM ratings r JOIN users u ON u.id = r.patient_id
        WHERE r.doctor_id=?
        ORDER BY r.created_at DESC LIMIT 20
    """, (doctor_id,)).fetchall()
    conn.close()
    return {
        "avg_rating": round(summary["avg_rating"] or 0, 1),
        "total_reviews": summary["total_reviews"],
        "breakdown": {
            "5": summary["five_star"], "4": summary["four_star"],
            "3": summary["three_star"], "2": summary["two_star"],
            "1": summary["one_star"]
        },
        "reviews": [dict(r) for r in reviews]
    }

@router.get("/my-rating/{doctor_id}/{patient_id}")
def my_rating(doctor_id: int, patient_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM ratings WHERE doctor_id=? AND patient_id=?",
        (doctor_id, patient_id)
    ).fetchone()
    conn.close()
    return dict(row) if row else None
