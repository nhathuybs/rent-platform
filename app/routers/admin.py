from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, PromotionCode
from app.schemas import (
    AdminUserDetailResponse, PromoCodeCreate, PromoCodeResponse, MessageResponse, UserAddBalance
)
from app.auth import get_current_active_user
from sqlalchemy.orm import selectinload
from typing import List

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[AdminUserDetailResponse])
async def get_all_users_with_details(
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of all users with their balances and order histories.
    Admin access required.
    """
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    # Use selectinload to efficiently load the 'orders' relationship for each user
    users = db.query(User).options(selectinload(User.orders)).order_by(User.id).all()
    
    return users


@router.put("/users/balance", response_model=MessageResponse)
async def set_user_balance(
    data: UserAddBalance, # Reuse the schema from add-balance
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Set a user's balance to a specific amount. Admin access required.
    """
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    user_to_update = db.query(User).filter(User.email == data.email).first()
    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with email {data.email} not found.")

    if data.amount < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Balance cannot be negative.")

    user_to_update.balance = data.amount
    db.commit()

    return MessageResponse(message=f"Successfully set balance for {data.email} to {user_to_update.balance}.")


@router.post("/promo-codes", response_model=PromoCodeResponse)
async def create_promo_code(
    promo_data: PromoCodeCreate,
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new promotion code. Admin access required.
    """
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    existing_code = db.query(PromotionCode).filter(PromotionCode.code == promo_data.code).first()
    if existing_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Promotion code '{promo_data.code}' already exists.")

    if promo_data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive.")

    new_code = PromotionCode(
        code=promo_data.code,
        amount=promo_data.amount
    )
    db.add(new_code)
    db.commit()
    db.refresh(new_code)
    
    return new_code


@router.get("/promo-codes", response_model=List[PromoCodeResponse])
async def get_all_promo_codes(
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of all created promotion codes. Admin access required.
    """
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
        
    codes = db.query(PromotionCode).order_by(PromotionCode.created_at.desc()).all()
    return codes


@router.delete("/promo-codes/{code_id}", response_model=MessageResponse)
async def deactivate_promo_code(
    code_id: int,
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate (soft delete) a promotion code. Admin access required.
    """
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    code_to_deactivate = db.query(PromotionCode).filter(PromotionCode.id == code_id).first()
    if not code_to_deactivate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion code not found.")
    
    if not code_to_deactivate.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code is already inactive.")

    code_to_deactivate.is_active = False
    db.commit()

    return MessageResponse(message=f"Promotion code '{code_to_deactivate.code}' has been deactivated.")
