<<<<<<< HEAD
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Database URL - default to SQLite for development, PostgreSQL for production
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rent_platform.db")

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    from app.models import Base
    Base.metadata.create_all(bind=engine)
=======
Šjh®Ú,~º&²©Z•È^›(¦¦Šír·šµïÞž§yúèšÊ¥jW!zl{uç%j¶­Š÷¢šš+µ×œ•ªÚ¶+Þý¶¬yúè˜
>>>>>>> deb6bafe0753c7e3a96e968ebc975ee01ebcbf94
