from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, Product, User
from app.schemas import OrderResponse, MessageResponse, OrderUpdate
from app.auth import get_current_active_user
from datetime import datetime, timedelta
import re

router = APIRouter(prefix="/orders", tags=["orders"])

def parse_duration_to_days(duration_str: str) -> int:
    """Parses a string like '30 Ngày' into an integer number of days."""
    match = re.search(r'\d+', duration_str)
    if match:
        return int(match.group(0))
    return 30 # Default to 30 days if parsing fails


@router.post("/buy/{product_id}", response_model=MessageResponse)
async def buy_product(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
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

    # 3. Calculate expiration date
    duration_days = parse_duration_to_days(product.duration)
    purchase_time = datetime.utcnow()
    expires_at = purchase_time + timedelta(days=duration_days)

    # 4. Create order
    new_order = Order(
        user_id=current_user.id,
        product_id=product.id,
        product_name=product.name,
        price=product.price,
        account_info=product.account_info,
        password_info=product.password_info,
        otp_info=product.otp_secret,
        purchase_time=purchase_time,
        expires_at=expires_at
    )
    
    db.add(new_order)
    db.commit()
    # --- End transaction ---
    
    return MessageResponse(message="Product purchased successfully. It will expire on " + expires_at.strftime('%Y-%m-%d %H:%M:%S'))


def create_order_response(order: Order, user_email: str = None, db: Session = None) -> OrderResponse:
    """Helper function to create an OrderResponse, calculating is_expired and renewal_price."""
    now = datetime.utcnow()
    is_expired = order.expires_at is None or now > order.expires_at
    
    # Get actual renewal price from product
    renewal_price = order.price  # Default to order price
    if db:
        product = db.query(Product).filter(Product.id == order.product_id).first()
        if product:
            renewal_price = product.price
    
    return OrderResponse(
        id=order.id,
        product_name=order.product_name,
        price=order.price,
        renewal_price=renewal_price,
        account_info=order.account_info,
        password_info=order.password_info,
        # Only show OTP info if the order is not expired
        otp_info=order.otp_info if not is_expired else None,
        purchase_time=order.purchase_time,
        expires_at=order.expires_at,
        is_expired=is_expired,
        user_email=user_email
    )


@router.get("/history", response_model=list[OrderResponse])
async def get_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get order history for current user"""
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.purchase_time.desc()).all()
    
    return [create_order_response(o, db=db) for o in orders]


@router.get("/all", response_model=list[OrderResponse])
async def get_all_orders(
    current_user: User = Depends(get_current_active_user),
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
    
    return [create_order_response(o, user_email=user_email_map.get(o.user_id), db=db) for o in orders]


# --- NEW ENDPOINTS ---

@router.post("/renew/{order_id}", response_model=MessageResponse, tags=["user_actions"])
async def renew_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Renew an existing order."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or you do not own this order.")

    product = db.query(Product).filter(Product.id == order.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="The original product for this order no longer exists.")

    # Check for balance
    if current_user.balance < product.price:
        raise HTTPException(status_code=400, detail=f"Insufficient balance to renew. You need {product.price}.")

    # Deduct balance
    current_user.balance -= product.price

    # Extend expiration
    duration_days = parse_duration_to_days(product.duration)
    # If the order is already expired, renew from now. Otherwise, extend the current expiration date.
    start_date = max(datetime.utcnow(), order.expires_at or datetime.utcnow())
    order.expires_at = start_date + timedelta(days=duration_days)
    
    db.commit()

    return MessageResponse(message=f"Successfully renewed. New expiration date is {order.expires_at.strftime('%Y-%m-%d')}.")


@router.post("/admin/assign", response_model=OrderResponse, tags=["admin_actions"])
async def admin_assign_product(
    user_email: str,
    product_id: int,
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Admin assigns a product to a user for free."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{user_email}' not found.")
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found.")
    
    # Check if product has stock
    if product.quantity <= 0:
        raise HTTPException(status_code=400, detail="Product is out of stock.")

    # Decrease product quantity
    product.quantity -= 1

    duration_days = parse_duration_to_days(product.duration)
    purchase_time = datetime.utcnow()
    expires_at = purchase_time + timedelta(days=duration_days)

    new_order = Order(
        user_id=user.id,
        product_id=product.id,
        product_name=product.name,
        price=0, # Assigned for free
        account_info=product.account_info,
        password_info=product.password_info,
        otp_info=product.otp_secret,
        purchase_time=purchase_time,
        expires_at=expires_at
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return create_order_response(new_order, user_email=user.email, db=db)


@router.delete("/admin/revoke/{order_id}", response_model=MessageResponse, tags=["admin_actions"])
async def admin_revoke_order(
    order_id: int,
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Admin revokes (deletes) a user's order."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    
    order_to_delete = db.query(Order).filter(Order.id == order_id).first()
    if not order_to_delete:
        raise HTTPException(status_code=404, detail="Order not found.")

    db.delete(order_to_delete)
    db.commit()

    return MessageResponse(message=f"Order ID {order_id} has been successfully revoked.")


@router.put("/admin/{order_id}", response_model=OrderResponse, tags=["admin_actions"])
async def admin_update_order(
    order_id: int,
    order_data: OrderUpdate,
    admin_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Admin updates an order's details (e.g., expiration date)."""
    if admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    
    order_to_update = db.query(Order).filter(Order.id == order_id).first()
    if not order_to_update:
        raise HTTPException(status_code=404, detail="Order not found.")

    order_to_update.expires_at = order_data.expires_at
    db.commit()
    db.refresh(order_to_update)

    # Need user email for the response
    user = db.query(User).filter(User.id == order_to_update.user_id).first()
    
    return create_order_response(order_to_update, user_email=user.email if user else None, db=db)

