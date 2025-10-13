# backend/create_venturing_user.py
"""
Create Venturing User Script
"""

from sqlite_auth import db_auth

def create_venturing_user():
    """Create Venturing user with Admin@123 password"""
    print("🚀 Creating Venturing User...")
    
    # Check if Venturing user already exists
    existing_user = db_auth.get_user_by_username("Venturing")
    if existing_user:
        print("✅ Venturing user already exists!")
        print(f"   Username: {existing_user['username']}")
        print(f"   Email: {existing_user['email']}")
        print(f"   Admin: {existing_user['is_admin']}")
        return
    
    # Create Venturing user
    result = db_auth.create_user(
        username="Venturing",
        password="Admin@123",
        email="venturing@venturingdigitally.com",
        full_name="Venturing User",
        is_admin=True
    )
    
    if result["success"]:
        print("✅ Venturing user created successfully!")
        print("   Username: Venturing")
        print("   Password: Admin@123")
        print("   Email: venturing@venturingdigitally.com")
        print("   Role: Admin")
    else:
        print(f"❌ Error creating Venturing user: {result['message']}")

if __name__ == "__main__":
    create_venturing_user()
