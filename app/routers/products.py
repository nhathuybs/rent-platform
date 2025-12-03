from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import pyotp
from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, CalcOtpResponse, MessageResponse
from app.routers.users import get_current_user_dep
from app.models import User

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/list", response_model=list[ProductResponse])
async def list_products(db: Session = Depends(get_db)):
    """Get list of all products (public endpoint)"""
    products = db.query(Product).all()
    return [ProductResponse(
        id=p.id,
        name=p.name,
        price=p.price,
        quantity=p.quantity,
        duration=p.duration
    ) for p in products]


@router.post("/add", response_model=MessageResponse)
async def add_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db)
):
    """Add a new product (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    new_product = Product(
        name=product_data.name,
        price=product_data.price,
        quantity=product_data.quantity,
        duration=product_data.duration,
        account_info=product_data.account,
        password_info=product_data.password,
        otp_secret=product_data.otp_secret
    )
    
    db.add(new_product)
    db.commit()
    
    return MessageResponse(message="Product added successfully")


@router.put("/{product_id}", response_model=ProductResponse, tags=["admin_actions"])
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user_dep),
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


@router.get("/calc-otp", response_model=CalcOtpResponse)
async def calc_otp(secret: str = Query(...)):
    """Calculate OTP from secret key"""
    try:
        totp = pyotp.TOTP(secret)
        otp = totp.now()
        return CalcOtpResponse(otp=otp)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid OTP secret: {str(e)}")
