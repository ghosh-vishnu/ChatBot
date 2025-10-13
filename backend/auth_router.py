# backend/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from database import get_db
from auth_service import get_auth_service, AuthService
from models import User
from schemas import LoginRequest, LoginResponse, UserResponse, TokenData

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# Dependency to get current user
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    auth_service = get_auth_service(db)
    
    # Verify token
    payload = auth_service.verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user_by_username(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    return current_user

def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current admin user"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

@router.post("/login", response_model=LoginResponse)
async def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login user and return access token"""
    auth_service = get_auth_service(db)
    
    # Authenticate user
    user = auth_service.authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=30)
    access_token = auth_service.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Create session
    session_token = auth_service.create_session(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800,  # 30 minutes in seconds
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@router.post("/logout")
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Logout user"""
    auth_service = get_auth_service(db)
    
    # Get token from credentials
    token = credentials.credentials
    
    # Logout session
    success = auth_service.logout_session(token)
    
    if success:
        return {"message": "Successfully logged out"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session"
        )

@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """Verify if token is valid"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "is_admin": current_user.is_admin
        }
    }
