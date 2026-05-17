from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db

router = APIRouter()

class SendMessage(BaseModel):
    sender_id: int
    receiver_id: int
    content: str

@router.post("/send")
def send_message(msg: SendMessage):
    if not msg.content.strip():
        raise HTTPException(400, "Message cannot be empty")
    conn = get_db()
    conn.execute("""
        INSERT INTO messages (sender_id, receiver_id, content)
        VALUES (?, ?, ?)
    """, (msg.sender_id, msg.receiver_id, msg.content.strip()))
    # Upsert conversation thread
    conn.execute("""
        INSERT INTO conversations (user1_id, user2_id, last_message, last_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user1_id, user2_id) DO UPDATE SET
            last_message=excluded.last_message, last_at=CURRENT_TIMESTAMP
    """, (min(msg.sender_id, msg.receiver_id),
          max(msg.sender_id, msg.receiver_id),
          msg.content.strip()[:80]))
    conn.commit()
    conn.close()
    return {"message": "Message sent"}

@router.get("/thread/{user_a}/{user_b}")
def get_thread(user_a: int, user_b: int):
    conn = get_db()
    messages = conn.execute("""
        SELECT m.*, u.name as sender_name
        FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE (m.sender_id=? AND m.receiver_id=?)
           OR (m.sender_id=? AND m.receiver_id=?)
        ORDER BY m.sent_at ASC
    """, (user_a, user_b, user_b, user_a)).fetchall()
    # Mark as read
    conn.execute("""
        UPDATE messages SET is_read=1
        WHERE receiver_id=? AND sender_id=?
    """, (user_a, user_b))
    conn.commit()
    conn.close()
    return [dict(m) for m in messages]

@router.get("/conversations/{user_id}")
def get_conversations(user_id: int):
    conn = get_db()
    convs = conn.execute("""
        SELECT c.*,
               u1.name as user1_name, u1.role as user1_role,
               u2.name as user2_name, u2.role as user2_role,
               (SELECT COUNT(*) FROM messages
                WHERE receiver_id=? AND is_read=0
                AND sender_id = CASE WHEN c.user1_id=? THEN c.user2_id ELSE c.user1_id END) as unread_count
        FROM conversations c
        JOIN users u1 ON u1.id = c.user1_id
        JOIN users u2 ON u2.id = c.user2_id
        WHERE c.user1_id=? OR c.user2_id=?
        ORDER BY c.last_at DESC
    """, (user_id, user_id, user_id, user_id)).fetchall()
    conn.close()
    return [dict(c) for c in convs]

@router.get("/unread-count/{user_id}")
def unread_count(user_id: int):
    conn = get_db()
    count = conn.execute(
        "SELECT COUNT(*) as cnt FROM messages WHERE receiver_id=? AND is_read=0", (user_id,)
    ).fetchone()
    conn.close()
    return {"unread": count["cnt"]}
