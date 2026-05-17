"""
LifeSet OTP Email Service
Sends OTP via Gmail SMTP.
Configure credentials in config.py
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from config import SMTP_EMAIL, SMTP_PASSWORD
except:
    SMTP_EMAIL    = ""
    SMTP_PASSWORD = ""


def send_otp_email(to_email: str, otp: str, name: str = "User") -> bool:
    """
    Send OTP email to user.
    Returns True if sent successfully, raises Exception if failed.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD or SMTP_EMAIL == "your_lifeset_gmail@gmail.com":
        raise Exception(
            "Email not configured. Please open lifeset/backend/config.py and set your SMTP_EMAIL and SMTP_PASSWORD."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"LifeSet – Your OTP is {otp}"
    msg["From"]    = f"LifeSet Health <{SMTP_EMAIL}>"
    msg["To"]      = to_email

    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="480" cellpadding="0" cellspacing="0"
  style="background:white;border-radius:24px;overflow:hidden;
         box-shadow:0 8px 32px rgba(34,197,94,0.15);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);
                 padding:36px;text-align:center;">
    <div style="font-size:44px;margin-bottom:10px;">🌿</div>
    <h1 style="color:white;margin:0;font-size:30px;font-weight:800;
               letter-spacing:-0.5px;">LifeSet</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">
      AI-Powered Preventive Healthcare</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px 36px;">
    <p style="color:#374151;font-size:17px;margin:0 0 6px;font-weight:600;">
      Hello {name} 👋</p>
    <p style="color:#6b7280;font-size:14px;margin:0 0 30px;line-height:1.7;">
      Use the verification code below to complete your LifeSet registration.
      This code is valid for <strong>10 minutes</strong>.</p>

    <!-- OTP Box -->
    <div style="background:#f0fdf4;border:2px dashed #86efac;
                border-radius:20px;padding:30px;text-align:center;
                margin-bottom:30px;">
      <p style="color:#15803d;font-size:12px;font-weight:700;
                margin:0 0 12px;text-transform:uppercase;letter-spacing:0.15em;">
        Your Verification Code</p>
      <p style="color:#14532d;font-size:52px;font-weight:900;
                letter-spacing:0.5em;margin:0;font-family:monospace;">
        {otp}</p>
      <p style="color:#86efac;font-size:12px;margin:12px 0 0;">
        ⏱ Expires in 10 minutes</p>
    </div>

    <p style="color:#9ca3af;font-size:12px;text-align:center;
              margin:0;line-height:1.6;">
      If you didn't create a LifeSet account, please ignore this email.<br/>
      Do not share this code with anyone.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;
                 padding:20px 36px;text-align:center;">
    <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.8;">
      LifeSet – AI-Powered Preventive Healthcare<br/>
      ⚠️ For health guidance only. Not a substitute for medical advice.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    plain = (
        f"Hello {name},\n\n"
        f"Your LifeSet verification OTP is: {otp}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you didn't create an account, please ignore this email.\n\n"
        f"LifeSet Team"
    )

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html,  "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

    print(f"✅ OTP email sent successfully to {to_email}")
    return True
