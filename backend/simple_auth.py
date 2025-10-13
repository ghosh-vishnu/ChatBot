# backend/simple_auth.py
"""
Simple File-based Authentication System
No database dependencies - uses JSON files
"""

import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
USERS_FILE = "users.json"
SESSIONS_FILE = "sessions.json"

class SimpleAuthService:
    """Simple file-based authentication service"""
    
    def __init__(self):
        self.users_file = USERS_FILE
        self.sessions_file = SESSIONS_FILE
        self._ensure_files_exist()
    
    def _ensure_files_exist(self):
        """Ensure user and session files exist"""
        if not os.path.exists(self.users_file):
            with open(self.users_file, 'w') as f:
                json.dump({}, f)
        
        if not os.path.exists(self.sessions_file):
            with open(self.sessions_file, 'w') as f:
                json.dump({}, f)
    
    def _load_users(self) -> Dict[str, Any]:
        """Load users from file"""
        try:
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _save_users(self, users: Dict[str, Any]):
        """Save users to file"""
        with open(self.users_file, 'w') as f:
            json.dump(users, f, indent=2)
    
    def _load_sessions(self) -> Dict[str, Any]:
        """Load sessions from file"""
        try:
            with open(self.sessions_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _save_sessions(self, sessions: Dict[str, Any]):
        """Save sessions to file"""
        with open(self.sessions_file, 'w') as f:
            json.dump(sessions, f, indent=2)
    
    def hash_password(self, password: str) -> str:
        """Hash password using simple hash (for development)"""
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.hash_password(plain_password) == hashed_password
    
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
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with username and password"""
        users = self._load_users()
        
        if username not in users:
            return None
        
        user = users[username]
        if not self.verify_password(password, user["password_hash"]):
            return None
        
        # Update last login
        user["last_login"] = datetime.utcnow().isoformat()
        users[username] = user
        self._save_users(users)
        
        return user
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        users = self._load_users()
        return users.get(username)
    
    def create_session(self, user: Dict[str, Any]) -> str:
        """Create user session and return token"""
        # Generate session token
        session_token = secrets.token_urlsafe(32)
        
        # Create session
        session = {
            "user_id": user["id"],
            "username": user["username"],
            "session_token": session_token,
            "expires_at": (datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        
        sessions = self._load_sessions()
        sessions[session_token] = session
        self._save_sessions(sessions)
        
        return session_token
    
    def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Validate session token and return user"""
        sessions = self._load_sessions()
        
        if session_token not in sessions:
            return None
        
        session = sessions[session_token]
        expires_at = datetime.fromisoformat(session["expires_at"])
        
        if datetime.utcnow() > expires_at:
            # Session expired, remove it
            del sessions[session_token]
            self._save_sessions(sessions)
            return None
        
        # Get user data
        users = self._load_users()
        username = session["username"]
        
        if username not in users:
            return None
        
        return users[username]
    
    def logout_session(self, session_token: str) -> bool:
        """Logout user by removing session"""
        sessions = self._load_sessions()
        
        if session_token in sessions:
            del sessions[session_token]
            self._save_sessions(sessions)
            return True
        
        return False

# Global auth service instance
auth_service = SimpleAuthService()
