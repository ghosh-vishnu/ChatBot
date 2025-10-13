# backend/auth_router.py
"""
SQLite Authentication Router
Handles login, logout, and token verification
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from sqlite_auth import db_auth

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    full_name: str

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login user and return access token"""
    try:
        # Authenticate user
        user = db_auth.authenticate_user(login_data.username, login_data.password)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token = db_auth.create_access_token(
            data={"sub": user["username"]},
            expires_delta=None
        )
        
        # Remove password hash from response
        user_response = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "is_admin": user["is_admin"],
            "is_active": user["is_active"]
        }
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register")
async def register(register_data: RegisterRequest):
    """Register a new user"""
    try:
        result = db_auth.create_user(
            username=register_data.username,
            password=register_data.password,
            email=register_data.email,
            full_name=register_data.full_name,
            is_admin=False
        )
        
        if result["success"]:
            return {"message": "User registered successfully", "user": result["user"]}
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify")
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user info"""
    try:
        # Verify token
        payload = db_auth.verify_token(credentials.credentials)
        if payload is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = db_auth.get_user_by_username(username)
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Remove password hash from response
        user_response = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "is_admin": user["is_admin"],
            "is_active": user["is_active"]
        }
        
        return {"valid": True, "user": user_response}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user (invalidate token)"""
    try:
        # For JWT tokens, we can't really "logout" server-side
        # The client should remove the token
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
