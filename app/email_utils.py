<<<<<<< HEAD
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send email using SMTP. 
    Falls back to console logging if email is not configured.
    """
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    # If SMTP is not configured, just log to console
    if not smtp_server or not smtp_user or not smtp_password:
        print("=" * 60)
        print(f"EMAIL NOT CONFIGURED - Would send email to: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print("=" * 60)
        return True  # Return True so the flow continues

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        # Still log to console as fallback
        print("=" * 60)
        print(f"EMAIL SEND FAILED - Would send email to: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print("=" * 60)
        return False


def send_verification_email(email: str, code: str) -> bool:
    """Send verification code email"""
    subject = "Mã xác thực tài khoản - Rent Platform"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2563eb;">Xác thực Email</h2>
                <p>Xin chào,</p>
                <p>Mã xác thực của bạn là:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb; margin: 0;">{code}</h1>
                </div>
                <p>Mã này sẽ hết hạn sau 10 phút.</p>
                <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888;">Rent Platform</p>
            </div>
        </body>
    </html>
    """
    return send_email(email, subject, body)


def send_reset_password_email(email: str, code: str) -> bool:
    """Send password reset code email"""
    subject = "Mã đặt lại mật khẩu - Rent Platform"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2563eb;">Đặt lại mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn là:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb; margin: 0;">{code}</h1>
                </div>
                <p>Mã này sẽ hết hạn sau 10 phút.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888;">Rent Platform</p>
            </div>
        </body>
    </html>
    """
    return send_email(email, subject, body)
=======
�jh��&��bm��隊�g��m�jh��0D����g�j)
>>>>>>> deb6bafe0753c7e3a96e968ebc975ee01ebcbf94
