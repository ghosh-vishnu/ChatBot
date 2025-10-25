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
from user_management_db import user_db

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
    """Login user and return access token - checks both admin and user databases"""
    try:
        user = None
        is_admin_user = False
        
        # First try to authenticate with main admin database
        print(f"Trying admin auth for user: {login_data.username}")
        user = db_auth.authenticate_user(login_data.username, login_data.password)
        if user:
            print(f"Admin auth successful for user: {login_data.username}")
            is_admin_user = True
        else:
            # If not found in admin DB, try user management database
            print(f"Trying user management auth for user: {login_data.username}")
            user = user_db.authenticate_user(login_data.username, login_data.password)
            if user:
                print(f"User management auth successful for user: {login_data.username}")
                is_admin_user = False
            else:
                print(f"Authentication failed for user: {login_data.username}")
        
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
        
        # Prepare user response based on which database the user came from
        if is_admin_user:
            user_response = {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "is_admin": user["is_admin"],
                "is_active": user["is_active"],
                "user_type": "admin",
                "role_name": "Super Admin",
                "profile_image": user.get("profile_image")
            }
        else:
            user_response = {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "is_admin": False,
                "is_active": user["is_active"],
                "user_type": "user",
                "role_id": user.get("role_id", 1),
                "role_name": user_db.get_role_by_id(user.get("role_id", 1))["name"] if user.get("role_id") and user_db.get_role_by_id(user.get("role_id", 1)) else "User",
                "profile_image": user.get("profile_image")
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
    """Verify JWT token and return user info - checks both admin and user databases"""
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
        
        user = None
        is_admin_user = False
        
        # First try to find user in main admin database
        user = db_auth.get_user_by_username(username)
        if user:
            is_admin_user = True
        else:
            # If not found in admin DB, try user management database
            user = user_db.get_user_by_username(username)
            if user:
                is_admin_user = False
        
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Prepare user response based on which database the user came from
        if is_admin_user:
            user_response = {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "is_admin": user["is_admin"],
                "is_active": user["is_active"],
                "user_type": "admin",
                "role_name": "Super Admin",
                "profile_image": user.get("profile_image")
            }
        else:
            user_response = {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "is_admin": False,
                "is_active": user["is_active"],
                "user_type": "user",
                "role_id": user.get("role_id", 1),
                "role_name": user_db.get_role_by_id(user.get("role_id", 1))["name"] if user.get("role_id") and user_db.get_role_by_id(user.get("role_id", 1)) else "User",
                "profile_image": user.get("profile_image")
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

# Profile management endpoints
class ProfileUpdate(BaseModel):
    full_name: str
    email: str
    username: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ProfileImageUpdate(BaseModel):
    profile_image: str

@router.put("/update-profile")
async def update_profile(profile_data: ProfileUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update user profile information"""
    try:
        # Verify token and get user
        payload = db_auth.verify_token(credentials.credentials)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user exists in admin database first
        user = db_auth.get_user_by_username(username)
        is_admin_user = True
        
        if not user:
            # Check user management database
            user = user_db.get_user_by_username(username)
            is_admin_user = False
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update profile based on which database the user is in
        if is_admin_user:
            # Update admin user
            updated_user = db_auth.update_user_profile(
                user["id"],
                full_name=profile_data.full_name,
                email=profile_data.email,
                username=profile_data.username
            )
            if not updated_user:
                raise HTTPException(status_code=400, detail="Failed to update profile")
            
            user_response = {
                "id": updated_user["id"],
                "username": updated_user["username"],
                "email": updated_user["email"],
                "full_name": updated_user["full_name"],
                "is_admin": updated_user["is_admin"],
                "is_active": updated_user["is_active"],
                "user_type": "admin",
                "role_name": "Super Admin",
                "profile_image": updated_user.get("profile_image")
            }
        else:
            # Update user management user
            updated_user = user_db.update_user_profile(
                user["id"],
                full_name=profile_data.full_name,
                email=profile_data.email,
                username=profile_data.username
            )
            if not updated_user:
                raise HTTPException(status_code=400, detail="Failed to update profile")
            
            # Get role name
            role_name = "User"
            if updated_user.get("role_id"):
                role = user_db.get_role_by_id(updated_user["role_id"])
                if role:
                    role_name = role["name"]
            
            user_response = {
                "id": updated_user["id"],
                "username": updated_user["username"],
                "email": updated_user["email"],
                "full_name": updated_user["full_name"],
                "is_admin": False,
                "is_active": updated_user["is_active"],
                "user_type": "user",
                "role_id": updated_user.get("role_id", 1),
                "role_name": role_name,
                "profile_image": updated_user.get("profile_image")
            }
        
        return {"message": "Profile updated successfully", "user": user_response}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/change-password")
async def change_password(password_data: PasswordChange, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Change user password"""
    try:
        # Verify token and get user
        payload = db_auth.verify_token(credentials.credentials)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user exists in admin database first
        user = db_auth.get_user_by_username(username)
        is_admin_user = True
        
        if not user:
            # Check user management database
            user = user_db.get_user_by_username(username)
            is_admin_user = False
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if is_admin_user:
            if not db_auth.verify_password(password_data.current_password, user["password_hash"]):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            
            # Update password in admin database
            success = db_auth.update_user_password(user["id"], password_data.new_password)
        else:
            if not user_db.verify_password(password_data.current_password, user["password_hash"]):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            
            # Update password in user management database
            success = user_db.update_user_password(user["id"], password_data.new_password)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update password")
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update-profile-image")
async def update_profile_image(image_data: ProfileImageUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update user profile image"""
    try:
        # Verify token and get user
        payload = db_auth.verify_token(credentials.credentials)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user exists in admin database first
        user = db_auth.get_user_by_username(username)
        is_admin_user = True
        
        if not user:
            # Check user management database
            user = user_db.get_user_by_username(username)
            is_admin_user = False
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update profile image based on which database the user is in
        if is_admin_user:
            success = db_auth.update_user_profile_image(user["id"], image_data.profile_image)
        else:
            success = user_db.update_user_profile_image(user["id"], image_data.profile_image)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update profile image")
        
        return {"message": "Profile image updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
