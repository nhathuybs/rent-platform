"""
Script to create the first admin user.
Run this script after setting up the database.

Usage:
    python create_admin.py

You will be prompted for email and password.
"""
from app.database import SessionLocal, init_db
from app.models import User
from app.auth import get_password_hash
import getpass

def create_admin():
    """Create an admin user"""
    # Initialize database
    init_db()
    
    db = SessionLocal()
    try:
        print("=" * 60)
        print("Create Admin User")
        print("=" * 60)
        
        email = input("Enter admin email: ").strip()
        if not email:
            print("Error: Email is required")
            return
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User with email {email} already exists.")
            response = input("Do you want to make this user an admin? (y/n): ").strip().lower()
            if response == 'y':
                existing_user.role = "admin"
                existing_user.is_verified = True
                db.commit()
                print(f"User {email} is now an admin!")
            return
        
        password = getpass.getpass("Enter admin password: ")
        if not password:
            print("Error: Password is required")
            return
        
        confirm_password = getpass.getpass("Confirm admin password: ")
        if password != confirm_password:
            print("Error: Passwords do not match")
            return
        
        # Create admin user
        admin_user = User(
            email=email,
            hashed_password=get_password_hash(password),
            role="admin",
            is_verified=True  # Admin doesn't need email verification
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("=" * 60)
        print(f"Admin user created successfully!")
        print(f"Email: {email}")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()

