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


class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    duration: str

    class Config:
        from_attributes = True


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
    user_email: Optional[str] = None
    user_balance_after: Optional[float] = None # For admin view

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str

