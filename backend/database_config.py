# backend/database_config.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database configuration - Using SQLite for development
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./venturing.db"
)

# For PostgreSQL production: 
# DATABASE_URL = "postgresql://postgres:admin@123@localhost:5432/venturing_db"

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)