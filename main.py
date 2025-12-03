from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import init_db, SessionLocal, get_db
from app.routers import users, products, orders, admin
from app.models import Announcement
from create_admin import create_default_admin

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(
    title="Rent Platform API",
    description="API for the Rent Platform application",
    version="1.0.0"
)

# A list of allowed origins. It's more secure to list them explicitly.
# I've included your production frontend, common local dev ports,
# and the Render backend URL itself.
origins = [
    "https://bubuns.dev",
    "https://rent-platform.pages.dev",
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173", # Vite default
    "https://rent-platform-1.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup():
    """
    Event handler that runs when the application starts up.
    It creates a database session and calls the function to create a default admin.
    """
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "Rent Platform API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/announcements/active")
async def get_active_announcements(db: Session = Depends(get_db)):
    """Get all active announcements (public endpoint)."""
    announcements = db.query(Announcement).filter(Announcement.is_active == True).order_by(Announcement.created_at.desc()).all()
    return [{
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in announcements]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
