import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "lifeset.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # ── Users (extended with role, phone, OTP) ──────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'patient',
            specialization TEXT,
            license_number TEXT,
            hospital_affiliation TEXT,
            bio TEXT,
            age INTEGER,
            gender TEXT,
            otp_code TEXT,
            otp_expiry TIMESTAMP,
            is_verified INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Health Profiles ──────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS health_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            age INTEGER, gender TEXT, weight REAL, height REAL,
            smoking INTEGER DEFAULT 0, alcohol INTEGER DEFAULT 0,
            exercise_freq TEXT, diet_type TEXT, medical_history TEXT,
            symptoms TEXT, blood_pressure_sys INTEGER, blood_pressure_dia INTEGER,
            blood_glucose REAL, cholesterol REAL, family_history TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Risk History ─────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS risk_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            heart_risk REAL, diabetes_risk REAL, stroke_risk REAL, hypertension_risk REAL,
            calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Reports ──────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            filename TEXT, file_path TEXT, report_type TEXT,
            analysis_result TEXT, abnormal_values TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Alerts ───────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            alert_type TEXT, message TEXT, severity TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Access Requests (doctor ↔ patient) ──────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS access_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL,
            patient_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            message TEXT,
            initiated_by TEXT DEFAULT 'patient',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP,
            FOREIGN KEY (doctor_id) REFERENCES users(id),
            FOREIGN KEY (patient_id) REFERENCES users(id),
            UNIQUE(doctor_id, patient_id)
        )
    """)

    # ── Doctor-Patient Messages ───────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
    """)

    # ── Doctor Ratings ────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL,
            patient_id INTEGER NOT NULL,
            stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
            review TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (doctor_id) REFERENCES users(id),
            FOREIGN KEY (patient_id) REFERENCES users(id),
            UNIQUE(doctor_id, patient_id)
        )
    """)

    # ── Chat Conversations (thread metadata) ────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            last_message TEXT,
            last_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES users(id),
            FOREIGN KEY (user2_id) REFERENCES users(id),
            UNIQUE(user1_id, user2_id)
        )
    """)

    conn.commit()
    conn.close()
    print("✅ Database v3 initialized")
