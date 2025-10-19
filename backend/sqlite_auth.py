# backend/sqlite_auth.py
"""
SQLite Database Authentication System
Immediate working solution
"""

import sqlite3
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database file
DB_FILE = "venturing.db"

class SQLiteAuth:
    """SQLite database authentication system"""
    
    def __init__(self):
        self.connection = None
        self._connect()
        self._init_tables()
    
    def _connect(self):
        """Connect to SQLite database"""
        try:
            self.connection = sqlite3.connect(DB_FILE)
            self.connection.row_factory = sqlite3.Row
            print("Connected to SQLite database")
        except Exception as e:
            print(f"Error connecting to SQLite: {e}")
            raise
    
    def _init_tables(self):
        """Initialize database tables"""
        try:
            cursor = self.connection.cursor()
            
            # Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT UNIQUE,
                    full_name TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    is_admin BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """)
            
            # Create sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id),
                    session_token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create conversations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(id),
                    user_message TEXT NOT NULL,
                    bot_response TEXT NOT NULL,
                    intent TEXT,
                    response_time INTEGER,
                    satisfaction_score INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create FAQs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS faqs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    category TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    views INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            self.connection.commit()
            cursor.close()
            print("✅ Database tables created successfully")
            
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            raise
    
    def hash_password(self, password: str) -> str:
        """Hash password using SHA256"""
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
    
    def create_user(self, username: str, password: str, email: str, full_name: str, is_admin: bool = False) -> Dict[str, Any]:
        """Create a new user"""
        try:
            cursor = self.connection.cursor()
            
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                return {"success": False, "message": "User already exists"}
            
            # Create new user
            password_hash = self.hash_password(password)
            cursor.execute("""
                INSERT INTO users (username, password_hash, email, full_name, is_admin)
                VALUES (?, ?, ?, ?, ?)
            """, (username, password_hash, email, full_name, is_admin))
            
            # Get the created user
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            
            self.connection.commit()
            cursor.close()
            
            return {"success": True, "message": "User created successfully", "user": dict(user)}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            cursor.close()
            return dict(user) if user else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with username and password"""
        user = self.get_user_by_username(username)
        if not user or not self.verify_password(password, user["password_hash"]):
            return None
        
        # Update last login
        try:
            cursor = self.connection.cursor()
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.utcnow(), user["id"]))
            self.connection.commit()
            cursor.close()
        except Exception as e:
            print(f"Error updating last login: {e}")
        
        return user
    
    def create_session(self, user_id: int, expires_minutes: int = 30) -> str:
        """Create user session"""
        try:
            cursor = self.connection.cursor()
            
            # Generate session token
            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(minutes=expires_minutes)
            
            cursor.execute("""
                INSERT INTO user_sessions (user_id, session_token, expires_at)
                VALUES (?, ?, ?)
            """, (user_id, session_token, expires_at))
            
            self.connection.commit()
            cursor.close()
            return session_token
            
        except Exception as e:
            print(f"Error creating session: {e}")
            return None
    
    def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Validate session token and return user"""
        try:
            cursor = self.connection.cursor()
            
            cursor.execute("""
                SELECT u.* FROM users u
                JOIN user_sessions s ON u.id = s.user_id
                WHERE s.session_token = ? AND s.expires_at > ?
            """, (session_token, datetime.utcnow()))
            
            user = cursor.fetchone()
            cursor.close()
            
            return dict(user) if user else None
            
        except Exception as e:
            print(f"Error validating session: {e}")
            return None
    
    def logout_session(self, session_token: str) -> bool:
        """Logout user session"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("DELETE FROM user_sessions WHERE session_token = ?", (session_token,))
            self.connection.commit()
            cursor.close()
            return True
        except Exception as e:
            print(f"Error logging out session: {e}")
            return False
    
    def init_database(self):
        """Initialize database with default admin user"""
        print("🚀 Initializing SQLite database...")
        
        # Check if admin user exists
        admin_user = self.get_user_by_username("admin")
        if not admin_user:
            # Create default admin user
            result = self.create_user(
                username="admin",
                password="admin123",
                email="admin@venturingdigitally.com",
                full_name="Admin User",
                is_admin=True
            )
            if result["success"]:
                print("✅ Default admin user created!")
                print("   Username: admin")
                print("   Password: admin123")
            else:
                print(f"❌ Error creating admin user: {result['message']}")
        else:
            print("ℹ️  Admin user already exists.")
        
        print("✅ SQLite database initialized successfully!")

    def update_user_profile(self, user_id: int, full_name: str = None, email: str = None, username: str = None) -> Optional[Dict]:
        """Update user profile information"""
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cursor = conn.cursor()
        
        try:
            # Build update query dynamically
            update_fields = []
            params = []
            
            if full_name is not None:
                update_fields.append("full_name = ?")
                params.append(full_name)
            
            if email is not None:
                update_fields.append("email = ?")
                params.append(email)
            
            if username is not None:
                update_fields.append("username = ?")
                params.append(username)
            
            if not update_fields:
                return None
            
            # Add updated_at timestamp
            update_fields.append("updated_at = ?")
            params.append(datetime.now(timezone.utc))
            
            # Add user_id for WHERE clause
            params.append(user_id)
            
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()
            
            # Get updated user
            cursor.execute('''
                SELECT id, username, email, password_hash, full_name, is_admin, is_active, created_at, last_login, profile_image
                FROM users WHERE id = ?
            ''', (user_id,))
            
            user = cursor.fetchone()
            if user:
                return {
                    "id": user[0],
                    "username": user[1],
                    "email": user[2],
                    "password_hash": user[3],
                    "full_name": user[4],
                    "is_admin": bool(user[5]),
                    "is_active": bool(user[6]),
                    "created_at": user[7],
                    "last_login": user[8],
                    "profile_image": user[9]
                }
            return None
            
        except Exception as e:
            print(f"Error updating user profile: {e}")
            return None
        finally:
            conn.close()

    def update_user_password(self, user_id: int, new_password: str) -> bool:
        """Update user password"""
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cursor = conn.cursor()
        
        try:
            # Hash the new password
            password_hash = self.hash_password(new_password)
            
            cursor.execute('''
                UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
            ''', (password_hash, datetime.now(timezone.utc), user_id))
            
            conn.commit()
            return cursor.rowcount > 0
            
        except Exception as e:
            print(f"Error updating password: {e}")
            return False
        finally:
            conn.close()

    def update_user_profile_image(self, user_id: int, profile_image: str) -> bool:
        """Update user profile image"""
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE users SET profile_image = ?, updated_at = ? WHERE id = ?
            ''', (profile_image, datetime.now(timezone.utc), user_id))
            
            conn.commit()
            return cursor.rowcount > 0
            
        except Exception as e:
            print(f"Error updating profile image: {e}")
            return False
        finally:
            conn.close()

    def get_all_faqs(self):
        """Get all FAQs from database"""
        try:
            conn = sqlite3.connect(DB_FILE, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, question, answer, category, views, success_rate, created_at, updated_at
                FROM faqs 
                WHERE is_active = 1
                ORDER BY created_at DESC
            """)
            faqs = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return faqs
        except Exception as e:
            print(f"Error getting FAQs: {e}")
            return []

    def update_faq_views(self, faq_id: int):
        """Update FAQ views count"""
        try:
            conn = sqlite3.connect(DB_FILE, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE faqs 
                SET views = views + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (faq_id,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating FAQ views: {e}")
            return False

# Global database instance
db_auth = SQLiteAuth()

