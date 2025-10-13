# backend/auth_service.py
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from models import User, UserSession

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """Authentication service for user management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user = self.db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        return user
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def create_session(self, user: User) -> str:
        """Create user session and return token"""
        # Generate session token
        session_token = secrets.token_urlsafe(32)
        
        # Create session
        session = UserSession(
            user_id=user.id,
            session_token=session_token,
            expires_at=datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        self.db.add(session)
        self.db.commit()
        
        return session_token
    
    def validate_session(self, session_token: str) -> Optional[User]:
        """Validate session token and return user"""
        session = self.db.query(UserSession).filter(
            UserSession.session_token == session_token,
            UserSession.expires_at > datetime.utcnow()
        ).first()
        
        if not session:
            return None
        
        return session.user
    
    def logout_session(self, session_token: str) -> bool:
        """Logout user by removing session"""
        session = self.db.query(UserSession).filter(
            UserSession.session_token == session_token
        ).first()
        
        if session:
            self.db.delete(session)
            self.db.commit()
            return True
        
        return False

# Global auth service instance
def get_auth_service(db: Session) -> AuthService:
    """Get authentication service instance"""
    return AuthService(db)
