import os
from sqlalchemy.orm import Session
from app.models import User
from app.auth import get_password_hash

# --- CONFIGURATION FOR THE DEFAULT ADMIN USER ---
# These should be set via environment variables in production!
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme123")

def create_default_admin(db: Session):
    """
    Checks if an admin user exists, and if not, creates a default one.
    This is safe to run on every application startup.
    """
    # Check if any admin user already exists
    admin_user = db.query(User).filter(User.role == "admin").first()
    
    if not admin_user:
        print("No admin account found. Creating default admin...")
        
        # Check if the default admin email is already taken by a regular user
        existing_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing_user:
            print(f"User with email {ADMIN_EMAIL} already exists. Promoting to admin.")
            existing_user.role = "admin"
            existing_user.is_verified = True # Also verify them
        else:
            print(f"Creating new admin user with email {ADMIN_EMAIL}.")
            new_admin = User(
                email=ADMIN_EMAIL,
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                role="admin",
                is_verified=True  # Default admin is pre-verified
            )
            db.add(new_admin)
        
        db.commit()
        print("Default admin user created or promoted successfully.")
    else:
        print("Admin user already exists. Skipping default admin creation.")

if __name__ == "__main__":
    # This part allows you to still run `python create_admin.py` manually if needed,
    # but it will require database session setup.
    # For automatic seeding, the function is called from main.py.
    print("This script is now designed to be called as a function from the main application.")
    print("To manually create an admin, you would need to set up a database session here.")