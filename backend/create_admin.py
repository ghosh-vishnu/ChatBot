# backend/create_admin.py
"""
Script to create admin user in file-based system
Run this script to create the admin user with password admin@123
"""

from simple_auth import auth_service
import json
import os

def create_admin_user():
    """Create admin user"""
    try:
        # Check if admin user already exists
        existing_admin = auth_service.get_user_by_username("admin")
        if existing_admin:
            print("✅ Admin user already exists!")
            print(f"Username: {existing_admin['username']}")
            print(f"Email: {existing_admin['email']}")
            return
        
        # Create admin user
        admin_user = {
            "id": 1,
            "username": "admin",
            "password_hash": auth_service.hash_password("admin123"),
            "email": "admin@venturingdigitally.com",
            "full_name": "Admin User",
            "is_active": True,
            "is_admin": True,
            "created_at": "2024-01-01T00:00:00",
            "last_login": None
        }
        
        # Save to users file
        users = auth_service._load_users()
        users["admin"] = admin_user
        auth_service._save_users(users)
        
        print("✅ Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
        print("Email: admin@venturingdigitally.com")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")

if __name__ == "__main__":
    create_admin_user()