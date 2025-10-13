from __future__ import annotations

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    suggestions: List[Dict[str, Any]] = []


# Authentication Schemas
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TokenData(BaseModel):
    username: Optional[str] = None

