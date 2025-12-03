from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, PromotionCode
from app.schemas import (
    UserRegister, UserVerify, UserLogin, UserResponse, AuthResponse,
    ResendVerification, ForgotPassword, ResetPassword, ChangePassword, MessageResponse,
    UserAddBalance, RedeemCodeRequest
)
from app.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_active_user, generate_verification_code, generate_reset_code
)
from app.email_utils import send_verification_email, send_reset_password_email

router = APIRouter(prefix="/users", tags=["users"])



@router.post("/register", response_model=MessageResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check password length before hashing
    if len(user_data.password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long. Please use a password with 72 bytes or fewer."
        )

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user and existing_user.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if existing_user and not existing_user.is_verified:
        # User exists but is not verified, resend verification
        verification_code = generate_verification_code()
        existing_user.verification_code = verification_code
        existing_user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)
        db.commit()
        send_verification_email(existing_user.email, verification_code)
        raise HTTPException(status_code=400, detail="This email is already registered but not verified. A new verification code has been sent.")

    # Create verification code
    verification_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        verification_code=verification_code,
        verification_code_expires=expires_at,
        is_verified=False,
        role="user"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send verification email
    send_verification_email(user_data.email, verification_code)
    
    return MessageResponse(message="Registration successful. Please verify your email.")


@router.post("/verify", response_model=MessageResponse)
async def verify(user_data: UserVerify, db: Session = Depends(get_db)):
    """Verify user email with code"""
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User already verified")
    
    if user.verification_code != user_data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if user.verification_code_expires and user.verification_code_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()
    
    return MessageResponse(message="Email verified successfully")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(data: ResendVerification, db: Session = Depends(get_db)):
    """Resend verification code"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User already verified")
    
    # Generate new code
    verification_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    user.verification_code = verification_code
    user.verification_code_expires = expires_at
    db.commit()
    
    # Send email
    send_verification_email(data.email, verification_code)
    
    return MessageResponse(message="Verification code resent successfully")


@router.post("/login", response_model=AuthResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_verified:
        # Automatically resend verification code if user is not verified
        new_code = generate_verification_code()
        user.verification_code = new_code
        user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)
        db.commit()
        
        try:
            send_verification_email(user.email, new_code)
        except Exception:
            # If sending email fails, don't block the login attempt feedback
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Email not verified"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user.id, email=user.email, role=user.role, balance=user.balance)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info"""
    return UserResponse(id=current_user.id, email=current_user.email, role=current_user.role, balance=current_user.balance)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(data: ForgotPassword, db: Session = Depends(get_db)):
    """Request password reset code"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Don't reveal if user exists for security
        return MessageResponse(message="If the email exists, a reset code has been sent")
    
    # Generate reset code
    reset_code = generate_reset_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    user.reset_code = reset_code
    user.reset_code_expires = expires_at
    db.commit()
    
    # Send email
    send_reset_password_email(data.email, reset_code)
    
    return MessageResponse(message="If the email exists, a reset code has been sent")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPassword, db: Session = Depends(get_db)):
    """Reset password with code"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.reset_code != data.reset_code:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    if user.reset_code_expires and user.reset_code_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset code expired")
    
    # Update password
    user.hashed_password = get_password_hash(data.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()
    
    return MessageResponse(message="Password reset successfully")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user's password"""
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    
    return MessageResponse(message="Password changed successfully")


# --- TEMPORARY ADMIN PROMOTION ENDPOINT ---
@router.get("/make-admin/{email}", response_model=MessageResponse, tags=["admin_utils"])
async def make_admin(email: str, db: Session = Depends(get_db)):
    """
    Find a user by email and promote them to admin.
    USE WITH CAUTION.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = "admin"
    db.commit()
    
    return MessageResponse(message=f"User {email} has been promoted to admin.")



@router.post("/redeem-code", response_model=MessageResponse, tags=["user_actions"])
async def redeem_promo_code(
    data: RedeemCodeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Redeem a promotion code to add balance to the user's account."""
    # Find the promotion code
    promo_code = db.query(PromotionCode).filter(PromotionCode.code == data.code, PromotionCode.is_active == True).first()
    if not promo_code:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion code not found or is inactive.")

    # Check if user has already used this code
    if promo_code in current_user.used_promotion_codes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already used this promotion code.")

    # Add balance and mark code as used by this user
    current_user.balance += promo_code.amount
    current_user.used_promotion_codes.append(promo_code)
    
    # Deactivate the code after one use (optional, depends on business logic)
    # If you want codes to be reusable by different users, comment out the next line
    promo_code.is_active = False

    db.commit()

    return MessageResponse(message=f"Successfully redeemed code {data.code}. {promo_code.amount} has been added to your balance.")


# --- ADMIN-ONLY ENDPOINT TO ADD BALANCE ---
@router.post("/add-balance", response_model=MessageResponse, tags=["admin_utils"])
async def add_balance(
    data: UserAddBalance,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Add balance to a user's account. Admin access required.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    user_to_update = db.query(User).filter(User.email == data.email).first()
    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with email {data.email} not found")

    if data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")

    user_to_update.balance += data.amount
    db.commit()

    return MessageResponse(message=f"Successfully added {data.amount} to {data.email}. New balance is {user_to_update.balance}.")
