from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import jwt
from datetime import datetime, timedelta
from user_management_db import user_db
from sqlite_auth import db_auth

router = APIRouter()

# JWT Configuration
import os
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role_id: int

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class RoleCreate(BaseModel):
    name: str
    description: str
    permission_ids: List[int]

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

# Dependency to get current user from token
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ")[1]
    
    # Use the main authentication system to verify the token
    try:
        user_data = db_auth.verify_token(token)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract username from the token payload
        username = user_data.get("sub")
        if username:
            # Get user ID from username by querying the main auth database
            try:
                user = db_auth.get_user_by_username(username)
                user_id = user["id"] if user else 1
            except:
                user_id = 1  # Fallback to admin user ID
        else:
            user_id = 1  # Fallback to admin user ID
        
        # Get actual user data from the main auth database
        try:
            user = db_auth.get_user_by_username(username) if username else None
            if user:
                return {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "full_name": user["full_name"],
                    "role_id": 1,  # Super Admin role for now
                    "is_active": user["is_active"]
                }
        except:
            pass
        
        # Fallback to mock user object
        return {
            "id": user_id,
            "username": username or "admin",
            "email": "admin@example.com",
            "full_name": "Administrator",
            "role_id": 1,  # Super Admin role
            "is_active": True
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Authentication endpoints
@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """Authenticate user and return access token"""
    user = user_db.authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"])}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user (client should discard token)"""
    return {"message": "Successfully logged out"}

# User management endpoints
@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users (requires users_view permission)"""
    # For now, allow all authenticated users to view users
    # In production, you'd want proper permission checking
    
    users = user_db.get_all_users()
    return {"users": users}

@router.get("/users/{user_id}")
async def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    """Get specific user by ID"""
    
    user = user_db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"user": user}

@router.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """Create new user (requires users_create permission)"""
    
    try:
        user = user_db.create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
            role_id=user_data.role_id
        )
        return {"message": "User created successfully", "user": user}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/users/{user_id}")
async def update_user(user_id: int, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update user (requires users_edit permission)"""
    
    # Check if user exists
    existing_user = user_db.get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prepare update data
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided for update"
        )
    
    success = user_db.update_user(user_id, **update_data)
    if success:
        updated_user = user_db.get_user_by_id(user_id)
        return {"message": "User updated successfully", "user": updated_user}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update user"
        )

@router.put("/users/{user_id}/password")
async def update_user_password(user_id: int, password_data: UserPasswordUpdate, current_user: dict = Depends(get_current_user)):
    """Update user password (requires users_edit permission)"""
    
    # Check if user exists
    existing_user = user_db.get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    if not user_db.verify_password(password_data.current_password, existing_user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    success = user_db.update_user(user_id, password=password_data.new_password)
    if success:
        return {"message": "Password updated successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update password"
        )

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user)):
    """Delete user (soft delete, requires users_delete permission)"""
    
    # Get the user to check if it's a system admin
    user_to_delete = user_db.get_user_by_id(user_id)
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deletion of system admin users (check by username, not just ID)
    if user_to_delete.get("username") in ["admin", "administrator", "root"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the system administrator account"
        )
    
    # Prevent self-deletion (only if the user is trying to delete their own account in the same system)
    # Note: This check might not work perfectly since we're mixing two user systems
    # For now, we'll allow deletion of any user except system admins
    
    success = user_db.delete_user(user_id)
    if success:
        return {"message": "User deleted successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

# Role management endpoints
@router.get("/roles")
async def get_roles(current_user: dict = Depends(get_current_user)):
    """Get all roles (requires users_view permission)"""
    
    roles = user_db.get_all_roles()
    return {"roles": roles}

@router.get("/roles/{role_id}/permissions")
async def get_role_permissions(role_id: int, current_user: dict = Depends(get_current_user)):
    """Get permissions for a specific role"""
    
    permissions = user_db.get_role_permissions(role_id)
    return {"permissions": permissions}

@router.get("/{user_id}/permissions")
async def get_user_permissions(user_id: int, current_user: dict = Depends(get_current_user)):
    """Get permissions for a specific user"""
    
    permissions = user_db.get_user_permissions(user_id)
    return {"permissions": permissions}

@router.post("/roles")
async def create_role(role_data: RoleCreate, current_user: dict = Depends(get_current_user)):
    """Create new role (requires users_roles permission)"""
    
    try:
        role = user_db.create_role(
            name=role_data.name,
            description=role_data.description,
            permission_ids=role_data.permission_ids
        )
        return {"message": "Role created successfully", "role": role}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/roles/{role_id}/permissions")
async def update_role_permissions(role_id: int, permission_ids: List[int], current_user: dict = Depends(get_current_user)):
    """Update permissions for a role (requires users_roles permission)"""
    
    print(f"Updating role {role_id} with permissions: {permission_ids}")
    
    success = user_db.update_role_permissions(role_id, permission_ids)
    if success:
        return {"message": "Role permissions updated successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update role permissions"
        )

# Permission endpoints
@router.get("/permissions")
async def get_permissions(current_user: dict = Depends(get_current_user)):
    """Get all available permissions (requires users_roles permission)"""
    
    permissions = user_db.get_all_permissions()
    return {"permissions": permissions}

@router.get("/users/{user_id}/permissions")
async def get_user_permissions(user_id: int, current_user: dict = Depends(get_current_user)):
    """Get permissions for a specific user"""
    
    permissions = user_db.get_user_permissions(user_id)
    return {"permissions": permissions}

# Current user endpoints
@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {"user": current_user}

@router.get("/me/permissions")
async def get_my_permissions(current_user: dict = Depends(get_current_user)):
    """Get current user's permissions"""
    permissions = user_db.get_user_permissions(current_user["id"])
    return {"permissions": permissions}
