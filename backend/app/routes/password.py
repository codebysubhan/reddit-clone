from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings
from app.db import get_mongodb
from app.auth import hash_password

router = APIRouter(prefix="/password", tags=["Password"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def send_reset_email(email: str, token: str, username: str):
    """Send password reset email via Gmail SMTP"""
    if not settings.mail_username or not settings.mail_password:
        print("Email not configured, skipping send")
        return False
    
    reset_link = f"{settings.frontend_url}/reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
            .container {{ max-width: 500px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .logo {{ font-size: 24px; font-weight: bold; color: #FF4500; }}
            .content {{ background: #f6f7f8; border-radius: 12px; padding: 30px; }}
            .button {{ display: inline-block; background: linear-gradient(to right, #FF4500, #dc2626); color: white; 
                       padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; color: #7c7c7c; font-size: 12px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔥 Reddit Clone</div>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>Hi <strong>{username}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </div>
                <p style="color: #7c7c7c; font-size: 14px;">This link expires in 1 hour.</p>
                <p style="color: #7c7c7c; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>Reddit Clone - Big Data Analytics Project</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset Your Password - Reddit Clone"
        msg["From"] = settings.mail_from
        msg["To"] = email
        
        msg.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(settings.mail_server, settings.mail_port) as server:
            server.starttls()
            server.login(settings.mail_username, settings.mail_password)
            server.sendmail(settings.mail_from, email, msg.as_string())
        
        print(f"Reset email sent to {email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


@router.post("/forgot")
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks
):
    """Request password reset email"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"email": request.email.lower()})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, you will receive a reset link."}
    
    # Check if user registered via OAuth (no password)
    if user.get("google_id") and not user.get("password_hash"):
        return {"message": "This account uses Google Sign-In. Please log in with Google."}
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    # Store token in database
    await mongodb.password_resets.delete_many({"user_id": user["_id"]})  # Remove old tokens
    await mongodb.password_resets.insert_one({
        "user_id": user["_id"],
        "token": token,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    })
    
    # Send email in background
    background_tasks.add_task(
        send_reset_email,
        request.email,
        token,
        user.get("display_name", user["username"])
    )
    
    return {"message": "If an account exists with this email, you will receive a reset link."}


@router.post("/reset")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Find valid token
    reset_doc = await mongodb.password_resets.find_one({
        "token": request.token,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password
    await mongodb.users.update_one(
        {"_id": reset_doc["user_id"]},
        {"$set": {"password_hash": hash_password(request.new_password)}}
    )
    
    # Delete used token
    await mongodb.password_resets.delete_one({"_id": reset_doc["_id"]})
    
    return {"message": "Password reset successfully. You can now log in."}


@router.get("/verify-token/{token}")
async def verify_reset_token(token: str):
    """Verify if reset token is valid"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    reset_doc = await mongodb.password_resets.find_one({
        "token": token,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    return {"valid": True}

