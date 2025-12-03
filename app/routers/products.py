from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import pyotp
from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, CalcOtpResponse, MessageResponse, ProductPublicResponse
from app.auth import get_current_active_user
from app.models import User

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/admin/list", tags=["admin"])
async def admin_list_products(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all products including soft-deleted ones."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    products = db.query(Product).order_by(Product.id).all()
    
    # Return raw dict response bypassing Pydantic validation to avoid 422 errors
    # caused by potential NULL values or type mismatches in the database
    response_list = []
    for p in products:
        response_list.append({
            "id": p.id,
            "name": p.name or "N/A",
            "price": float(p.price) if p.price is not None else 0.0,
            "quantity": int(p.quantity) if p.quantity is not None else 0,
            "duration": p.duration or "N/A",
            "account_info": p.account_info or None,
            "password_info": p.password_info or None,
            "otp_secret": p.otp_secret or None,
            "is_deleted": bool(p.is_deleted) if p.is_deleted is not None else False,
            "deleted_at": p.deleted_at.isoformat() if p.deleted_at else None,
        })
    return response_list


@router.get("/list")
async def list_products(db: Session = Depends(get_db)):
    """Get list of all products (public endpoint)"""
    from app.models import Order
    
    # Only return products that are not soft-deleted
    products_from_db = db.query(Product).filter(Product.is_deleted == False).all()

    # Return raw dict response bypassing Pydantic validation
    response_list = []
    for p in products_from_db:
        # Check if product is currently rented (has active non-expired orders)
        # This includes both purchased and admin-assigned orders
        now = datetime.utcnow()
        active_rentals = db.query(Order).filter(
            Order.product_id == p.id,
            Order.expires_at > now
        ).count()
        
        # Product is "rented" if there are active rentals
        is_rented = active_rentals > 0
        
        response_list.append({
            "id": p.id,
            "name": p.name or "N/A",
            "price": float(p.price) if p.price is not None else 0.0,
            "quantity": int(p.quantity) if p.quantity is not None else 0,
            "duration": p.duration or "N/A",
            "is_rented": is_rented,
        })
    return response_list


@router.get("/calc-otp")
async def calc_otp(secret: str = Query(...)):
    """Calculate OTP from secret key"""
    try:
        totp = pyotp.TOTP(secret)
        otp = totp.now()
        return {"otp": otp}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid OTP secret: {str(e)}")


@router.post("/add", response_model=MessageResponse)
async def add_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a new product (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        new_product = Product(
            name=product_data.name[:255],  # Truncate if too long
            price=product_data.price,
            quantity=product_data.quantity,
            duration=product_data.duration[:50],
            account_info=product_data.account,
            password_info=product_data.password,
            otp_secret=product_data.otp_secret
        )
        
        db.add(new_product)
        db.commit()
        
        return MessageResponse(message="Product added successfully")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to add product: {str(e)}")



@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a product's details (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.get("/admin/{product_id}", response_model=ProductResponse, tags=["admin_utils"])
async def admin_get_product(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Temporary admin-only GET for product (debugging).

    Requires admin role. This endpoint is added temporarily to help
    verify deployed server can return product details via GET.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.put("/{product_id}", response_model=ProductResponse, tags=["admin_actions"])
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a product's details (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get the update data, excluding unset fields
    update_data = product_data.dict(exclude_unset=True)

    # Manually map frontend field names to backend model names if they differ
    if 'account_info' in update_data:
        update_data['account_info'] = update_data.pop('account_info')
    if 'password_info' in update_data:
        update_data['password_info'] = update_data.pop('password_info')

    # Update the product object with new data
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    
    return product


@router.delete("/{product_id}", response_model=MessageResponse, tags=["admin_actions"])
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Hard delete a product from database (admin-only)."""
    from app.models import Order
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Delete all orders related to this product first (to avoid foreign key constraint)
    db.query(Order).filter(Order.product_id == product_id).delete()
    
    # Hard delete - remove completely from database
    db.delete(product)
    db.commit()

    return MessageResponse(message="Product deleted permanently")
