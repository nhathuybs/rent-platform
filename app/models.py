from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    balance = Column(Float, nullable=False, default=0.0, server_default="0.0")
    role = Column(String, default="user")  # 'user' or 'admin'
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_code_expires = Column(DateTime, nullable=True)
    reset_code = Column(String, nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="user")
    # Add relationship to promotion codes
    used_promotion_codes = relationship(
        "PromotionCode",
        secondary="user_promotion_codes",
        back_populates="used_by_users"
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, default=0)
    duration = Column(String, nullable=False)  # e.g., "30 Ngày"
    account_info = Column(Text, nullable=False)
    password_info = Column(String, nullable=False)
    otp_secret = Column(String, nullable=True)  # For 2FA/OTP generation
    created_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    orders = relationship("Order", back_populates="product")


class PromotionCode(Base):
    __tablename__ = "promotion_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    used_by_users = relationship(
        "User",
        secondary="user_promotion_codes",
        back_populates="used_promotion_codes"
    )


# Association table for User and PromotionCode many-to-many relationship
user_promotion_codes = Table(
    "user_promotion_codes",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("promotion_code_id", Integer, ForeignKey("promotion_codes.id"), primary_key=True),
)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String, nullable=False)  # Denormalized for history
    price = Column(Float, nullable=False)
    account_info = Column(Text, nullable=False)
    password_info = Column(String, nullable=False)
    otp_info = Column(String, nullable=True)  # OTP secret for 2FA
    purchase_time = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders")
    product = relationship("Product", back_populates="orders")

