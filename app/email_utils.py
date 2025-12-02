import os
from typing import Optional
from fastapi import HTTPException
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send email using the SendGrid Web API.
    Falls back to console logging if the API key is not configured.
    """
    # We reuse the SMTP_PASSWORD variable for the SendGrid API Key for convenience
    sendgrid_api_key = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM")

    # If SendGrid is not configured, just log to console
    if not sendgrid_api_key or not smtp_from:
        print("=" * 60)
        print(f"EMAIL NOT CONFIGURED - Would send email to: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print("=" * 60)
        return True

    message = Mail(
        from_email=smtp_from,
        to_emails=to_email,
        subject=subject,
        html_content=body
    )
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        # A successful send returns a 202 status code
        if response.status_code == 202:
            print(f"Email sent to {to_email} successfully via SendGrid.")
            return True
        else:
            # Log the error from SendGrid for debugging
            print(f"Failed to send email via SendGrid. Status Code: {response.status_code}")
            print(f"Response Body: {response.body}")
            return False
            
    except Exception as e:
        print(f"An exception occurred while sending email: {e}")
        # Fallback to console logging if there is an exception
        print("="*60)
        print(f"FALLBACK - VERIFICATION CODE for {to_email}:")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}")
        print("="*60)
        return True # Return true to not block the user flow




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
