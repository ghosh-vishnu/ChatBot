# backend/database.py
from sqlalchemy.orm import Session
from database_config import engine, SessionLocal
from models import Base
import os

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """Initialize database with tables"""
    try:
        create_tables()
        print("Database initialized successfully!")
        return True
    except Exception as e:
        print(f"Database initialization failed: {e}")
        return False

def test_connection():
    """Test database connection"""
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        print("Database connection successful!")
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False
