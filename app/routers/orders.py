from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, Product, User
from app.schemas import OrderResponse, MessageResponse
from app.routers.users import get_current_user_dep
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/buy/{product_id}", response_model=MessageResponse)
async def buy_product(
    product_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db)
):
    """Buy/rent a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.quantity <= 0:
        raise HTTPException(status_code=400, detail="Product out of stock")
    
    # Check if user has enough balance
    if current_user.balance < product.price:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. You need {product.price} but only have {current_user.balance}."
        )

    # --- Start transaction ---
    # 1. Deduct balance from user
    current_user.balance -= product.price
    
    # 2. Decrease product quantity
    product.quantity -= 1

    # 3. Create order
    new_order = Order(
        user_id=current_user.id,
        product_id=product.id,
        product_name=product.name,
        price=product.price,
        account_info=product.account_info,
        password_info=product.password_info,
        otp_info=product.otp_secret,
        purchase_time=datetime.utcnow()
    )
    
    db.add(new_order)
    db.commit()
    # --- End transaction ---
    
    return MessageResponse(message="Product purchased successfully")


@router.get("/history", response_model=list[OrderResponse])
async def get_history(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db)
):
    """Get order history for current user"""
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.purchase_time.desc()).all()
    
    return [OrderResponse(
        id=o.id,
        product_name=o.product_name,
        price=o.price,
        account_info=o.account_info,
        password_info=o.password_info,
        otp_info=o.otp_info,
        purchase_time=o.purchase_time
    ) for o in orders]


@router.get("/all", response_model=list[OrderResponse])
async def get_all_orders(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db)
):
    """Get all orders (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all orders with user emails
    orders = db.query(Order).order_by(Order.purchase_time.desc()).all()
    
    # Build a map of user_id to email for efficiency
    user_ids = [o.user_id for o in orders]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_email_map = {user.id: user.email for user in users}
    
    result = []
    for o in orders:
        result.append(OrderResponse(
            id=o.id,
            product_name=o.product_name,
            price=o.price,
            account_info=o.account_info,
            password_info=o.password_info,
            otp_info=o.otp_info,
            purchase_time=o.purchase_time,
            user_email=user_email_map.get(o.user_id)
        ))
    
    return result

