# backend/simple_auth_router.py
"""
Simple Authentication Router for File-based System
No database dependencies
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import timedelta
from typing import Optional

from simple_auth import auth_service
from schemas import LoginRequest, LoginResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# Dependency to get current user
def get_current_user(credentials: HTTPAuthorizationCredentials = None) -> dict:
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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

def get_current_active_user(current_user: dict = None) -> dict:
    """Get current active user"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    return current_user

def get_current_admin_user(current_user: dict = None) -> dict:
    """Get current admin user"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

@router.post("/login", response_model=LoginResponse)
async def login_user(login_data: LoginRequest):
    """Login user and return access token"""
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
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    # Create session
    session_token = auth_service.create_session(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800,  # 30 minutes in seconds
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "is_admin": user["is_admin"]
        }
    }

@router.get("/me")
async def get_current_user_info(current_user: dict = None):
    """Get current user information"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return current_user

@router.post("/logout")
async def logout_user(credentials: HTTPAuthorizationCredentials = None):
    """Logout user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
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
async def verify_token(current_user: dict = None):
    """Verify if token is valid"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    return {
        "valid": True,
        "user": {
            "id": current_user["id"],
            "username": current_user["username"],
            "is_admin": current_user["is_admin"]
        }
    }
