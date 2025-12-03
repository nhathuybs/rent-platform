from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# User Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str


class UserVerify(BaseModel):
    email: EmailStr
    code: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    balance: float

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserAddBalance(BaseModel):
    email: EmailStr
    amount: float


class ResendVerification(BaseModel):
    email: EmailStr


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


# Product Schemas
class ProductCreate(BaseModel):
    name: str
    price: float
    quantity: int
    duration: str
    account: str
    password: str
    otp_secret: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    duration: Optional[str] = None
    account_info: Optional[str] = None # Corresponds to account in create
    password_info: Optional[str] = None # Corresponds to password in create
    otp_secret: Optional[str] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    duration: str
    account_info: str | None = None
    password_info: str | None = None
    otp_secret: str | None = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class CalcOtpResponse(BaseModel):
    otp: str


# Order Schemas
class OrderResponse(BaseModel):
    id: int
    product_name: str
    price: float
    account_info: str
    password_info: str
    otp_info: Optional[str]
    purchase_time: datetime
    expires_at: Optional[datetime]
    is_expired: bool = False
    user_email: Optional[str] = None
    user_balance_after: Optional[float] = None # For admin view

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str


# --- Promotion Code Schemas ---

class PromoCodeCreate(BaseModel):
    code: str
    amount: float

class PromoCodeResponse(BaseModel):
    id: int
    code: str
    amount: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RedeemCodeRequest(BaseModel):
    code: str


# --- Admin Schemas ---

class AdminUserDetailResponse(UserResponse):
    orders: list[OrderResponse] = []


class OrderUpdate(BaseModel):
    expires_at: datetime

