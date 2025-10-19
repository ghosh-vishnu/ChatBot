#!/usr/bin/env python3
"""
Script to set up the admin user in the user management system
This will create a Super Admin user that can manage all other users
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from user_management_db import user_db

def setup_admin_user():
    """Set up the admin user in the user management system"""
    
    # Check if admin user already exists
    existing_users = user_db.get_all_users()
    admin_user = next((user for user in existing_users if user['username'] == 'admin'), None)
    
    if admin_user:
        print("Admin user already exists in user management system")
        print(f"Admin user ID: {admin_user['id']}")
        print(f"Admin role: {admin_user['role_name']}")
        return
    
    # Get the Super Admin role
    roles = user_db.get_all_roles()
    super_admin_role = next((role for role in roles if role['name'] == 'Super Admin'), None)
    
    if not super_admin_role:
        print("Error: Super Admin role not found. Please run the database initialization first.")
        return
    
    try:
        # Create admin user
        admin_user = user_db.create_user(
            username='admin',
            email='admin@example.com',
            password='admin123',  # Change this in production
            full_name='System Administrator',
            role_id=super_admin_role['id']
        )
        
        print("✅ Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: admin123")
        print(f"Role: Super Admin")
        print(f"User ID: {admin_user['id']}")
        print("\n⚠️  IMPORTANT: Change the admin password after first login!")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")

if __name__ == "__main__":
    print("Setting up admin user for user management system...")
    setup_admin_user()
