import sqlite3
import hashlib
import secrets
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple

class UserManagementDB:
    def __init__(self, db_path: str = "user_management.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize the user management database with tables for users, roles, and permissions"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                profile_image TEXT,
                FOREIGN KEY (role_id) REFERENCES roles (id)
            )
        ''')

        # Create roles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                is_system_role BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create permissions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                module TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create role_permissions junction table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_id INTEGER,
                permission_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles (id),
                FOREIGN KEY (permission_id) REFERENCES permissions (id),
                UNIQUE(role_id, permission_id)
            )
        ''')

        # Create user_sessions table for tracking active sessions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        conn.commit()
        conn.close()

        # Initialize default data
        self._initialize_default_data()

    def _initialize_default_data(self):
        """Initialize default roles and permissions"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        # Check if data already exists
        cursor.execute("SELECT COUNT(*) FROM roles")
        if cursor.fetchone()[0] > 0:
            conn.close()
            return

        # Insert default roles
        roles = [
            ("Super Admin", "Full access to all modules and settings", 1),
            ("Manager", "Access to analytics and reports", 0),
            ("Support", "Access to tickets and FAQ management", 0),
            ("Analyst", "Access to analytics and reporting features", 0)
        ]

        for role_name, description, is_system in roles:
            cursor.execute('''
                INSERT INTO roles (name, description, is_system_role) 
                VALUES (?, ?, ?)
            ''', (role_name, description, is_system))

        # Insert default permissions
        permissions = [
            # Dashboard permissions
            ("dashboard_view", "Dashboard", "View dashboard overview"),
            ("dashboard_analytics", "Dashboard", "View analytics and metrics"),
            
            # FAQ permissions
            ("faq_view", "FAQ Management", "View FAQs"),
            ("faq_create", "FAQ Management", "Create new FAQs"),
            ("faq_edit", "FAQ Management", "Edit existing FAQs"),
            ("faq_delete", "FAQ Management", "Delete FAQs"),
            ("faq_import_export", "FAQ Management", "Import/Export FAQs"),
            
            # Ticket permissions
            ("ticket_view", "Ticket Management", "View tickets"),
            ("ticket_assign", "Ticket Management", "Assign tickets"),
            ("ticket_resolve", "Ticket Management", "Resolve tickets"),
            ("ticket_delete", "Ticket Management", "Delete tickets"),
            
            # Reports permissions
            ("reports_view", "Reports", "View reports and analytics"),
            ("reports_export", "Reports", "Export reports"),
            
            # User Management permissions
            ("users_view", "User Management", "View users"),
            ("users_create", "User Management", "Create new users"),
            ("users_edit", "User Management", "Edit user details"),
            ("users_delete", "User Management", "Delete users"),
            ("users_roles", "User Management", "Manage user roles and permissions"),
            
            # System permissions
            ("system_settings", "System", "Access system settings"),
            ("system_logs", "System", "View system logs"),
            
            # Live Chat permissions
            ("livechat_view", "Live Chat", "View live chat sessions"),
            ("livechat_manage", "Live Chat", "Manage live chat sessions"),
            ("livechat_accept", "Live Chat", "Accept chat requests"),
            ("livechat_reject", "Live Chat", "Reject chat requests"),
            ("livechat_end", "Live Chat", "End chat sessions"),
            ("livechat_monitor", "Live Chat", "Monitor chat activity"),
            
            # Analytics permissions
            ("analytics_view", "Analytics", "View analytics dashboard"),
            ("analytics_export", "Analytics", "Export analytics data"),
            ("analytics_realtime", "Analytics", "View real-time analytics"),
            ("analytics_reports", "Analytics", "Generate analytics reports"),
            
            # Overview permissions
            ("overview_dashboard", "Overview", "Access main dashboard"),
            ("overview_stats", "Overview", "View dashboard statistics"),
            ("overview_metrics", "Overview", "View key metrics"),
            ("overview_health", "Overview", "View system health"),
            
            # Notifications permissions
            ("notifications_view", "Notifications", "View notifications"),
            ("notifications_manage", "Notifications", "Manage notifications"),
            ("notifications_send", "Notifications", "Send notifications"),
            
            # Content Management permissions
            ("content_view", "Content Management", "View content"),
            ("content_create", "Content Management", "Create content"),
            ("content_edit", "Content Management", "Edit content"),
            ("content_delete", "Content Management", "Delete content"),
            ("content_publish", "Content Management", "Publish content")
        ]

        for perm_name, module, description in permissions:
            cursor.execute('''
                INSERT INTO permissions (name, module, description) 
                VALUES (?, ?, ?)
            ''', (perm_name, module, description))

        # Assign permissions to roles
        role_permissions = {
            "Super Admin": [perm[0] for perm in permissions],  # All permissions
            "Manager": [
                "dashboard_view", "dashboard_analytics", "overview_dashboard", "overview_stats", "overview_metrics",
                "analytics_view", "analytics_export", "analytics_realtime", "analytics_reports",
                "faq_view", "faq_create", "faq_edit", "faq_import_export",
                "ticket_view", "ticket_assign", "ticket_resolve",
                "reports_view", "reports_export",
                "livechat_view", "livechat_monitor",
                "notifications_view", "notifications_manage",
                "content_view", "content_create", "content_edit", "content_publish"
            ],
            "Support": [
                "dashboard_view", "overview_dashboard", "overview_stats",
                "faq_view", "faq_create", "faq_edit",
                "ticket_view", "ticket_assign", "ticket_resolve",
                "livechat_view", "livechat_manage", "livechat_accept", "livechat_reject", "livechat_end", "livechat_monitor",
                "notifications_view",
                "content_view"
            ],
            "Analyst": [
                "dashboard_view", "overview_dashboard", "overview_stats", "overview_metrics",
                "analytics_view", "analytics_export", "analytics_realtime", "analytics_reports",
                "reports_view", "reports_export",
                "livechat_view", "livechat_monitor",
                "notifications_view"
            ]
        }

        for role_name, perm_names in role_permissions.items():
            # Get role ID
            cursor.execute("SELECT id FROM roles WHERE name = ?", (role_name,))
            role_id = cursor.fetchone()[0]

            # Get permission IDs and assign to role
            for perm_name in perm_names:
                cursor.execute("SELECT id FROM permissions WHERE name = ?", (perm_name,))
                perm_id = cursor.fetchone()[0]
                cursor.execute('''
                    INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
                    VALUES (?, ?)
                ''', (role_id, perm_id))

        conn.commit()
        conn.close()

    def hash_password(self, password: str) -> str:
        """Hash password using SHA-256 with salt"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"

    def verify_password(self, password: str, stored_hash: str) -> bool:
        """Verify password against stored hash"""
        try:
            salt, hash_value = stored_hash.split(':')
            return hashlib.sha256((password + salt).encode()).hexdigest() == hash_value
        except:
            return False

    def create_user(self, username: str, email: str, password: str, full_name: str, role_id: int) -> Dict:
        """Create a new user"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        try:
            password_hash = self.hash_password(password)
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, role_id)
                VALUES (?, ?, ?, ?, ?)
            ''', (username, email, password_hash, full_name, role_id))

            user_id = cursor.lastrowid
            conn.commit()

            return {
                "id": user_id,
                "username": username,
                "email": email,
                "full_name": full_name,
                "role_id": role_id,
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }
        except sqlite3.IntegrityError as e:
            if "username" in str(e):
                raise ValueError("Username already exists")
            elif "email" in str(e):
                raise ValueError("Email already exists")
            else:
                raise ValueError("User creation failed")
        finally:
            conn.close()

    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user and return user data"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, username, email, password_hash, full_name, role_id, is_active, profile_image
            FROM users WHERE username = ? AND is_active = 1
        ''', (username,))

        user = cursor.fetchone()
        conn.close()

        if user and self.verify_password(password, user[3]):
            # Update last login
            self.update_last_login(user[0])
            return {
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "full_name": user[4],
                "role_id": user[5],
                "is_active": bool(user[6]),
                "profile_image": user[7]
            }
        return None

    def update_last_login(self, user_id: int):
        """Update user's last login timestamp"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
        ''', (user_id,))
        conn.commit()
        conn.close()

    def get_all_users(self) -> List[Dict]:
        """Get all users with their role information"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.is_active, 
                   u.created_at, u.last_login, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        ''')

        users = []
        for row in cursor.fetchall():
            users.append({
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "full_name": row[3],
                "role_id": row[4],
                "is_active": bool(row[5]),
                "created_at": row[6],
                "last_login": row[7],
                "role_name": row[8]
            })

        conn.close()
        return users

    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.is_active, 
                   u.created_at, u.last_login, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        ''', (user_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "full_name": row[3],
                "role_id": row[4],
                "is_active": bool(row[5]),
                "created_at": row[6],
                "last_login": row[7],
                "role_name": row[8]
            }
        return None

    def update_user(self, user_id: int, **kwargs) -> bool:
        """Update user information"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        try:
            # Handle password update
            if 'password' in kwargs:
                kwargs['password_hash'] = self.hash_password(kwargs.pop('password'))

            # Build update query
            set_clause = ', '.join([f"{key} = ?" for key in kwargs.keys()])
            values = list(kwargs.values()) + [user_id]

            cursor.execute(f'''
                UPDATE users SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', values)

            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def delete_user(self, user_id: int) -> bool:
        """Delete user (soft delete by setting is_active = 0)"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        ''', (user_id,))

        conn.commit()
        conn.close()
        return cursor.rowcount > 0

    def get_all_roles(self) -> List[Dict]:
        """Get all roles"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, name, description, is_system_role, created_at
            FROM roles ORDER BY name
        ''')

        roles = []
        for row in cursor.fetchall():
            roles.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "is_system_role": bool(row[3]),
                "created_at": row[4]
            })

        conn.close()
        return roles

    def get_role_permissions(self, role_id: int) -> List[Dict]:
        """Get permissions for a specific role"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT p.id, p.name, p.module, p.description
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY p.module, p.name
        ''', (role_id,))

        permissions = []
        for row in cursor.fetchall():
            permissions.append({
                "id": row[0],
                "name": row[1],
                "module": row[2],
                "description": row[3]
            })

        conn.close()
        return permissions

    def get_user_permissions(self, user_id: int) -> List[Dict]:
        """Get permissions for a specific user based on their role"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT p.id, p.name, p.module, p.description
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN users u ON rp.role_id = u.role_id
            WHERE u.id = ? AND u.is_active = 1
            ORDER BY p.module, p.name
        ''', (user_id,))

        permissions = []
        for row in cursor.fetchall():
            permissions.append({
                "id": row[0],
                "name": row[1],
                "module": row[2],
                "description": row[3]
            })

        conn.close()
        return permissions

    def check_permission(self, user_id: int, permission_name: str) -> bool:
        """Check if user has specific permission"""
        permissions = self.get_user_permissions(user_id)
        return any(perm['name'] == permission_name for perm in permissions)

    def create_role(self, name: str, description: str, permission_ids: List[int]) -> Dict:
        """Create a new role with permissions"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO roles (name, description) VALUES (?, ?)
            ''', (name, description))
            role_id = cursor.lastrowid

            # Add permissions to role
            for perm_id in permission_ids:
                cursor.execute('''
                    INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
                ''', (role_id, perm_id))

            conn.commit()
            return {
                "id": role_id,
                "name": name,
                "description": description,
                "permission_count": len(permission_ids)
            }
        except sqlite3.IntegrityError:
            raise ValueError("Role name already exists")
        finally:
            conn.close()

    def update_role_permissions(self, role_id: int, permission_ids: List[int]) -> bool:
        """Update permissions for a role"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        try:
            # Remove existing permissions
            cursor.execute('DELETE FROM role_permissions WHERE role_id = ?', (role_id,))

            # Add new permissions
            for perm_id in permission_ids:
                cursor.execute('''
                    INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
                ''', (role_id, perm_id))

            conn.commit()
            return True
        finally:
            conn.close()

    def get_all_permissions(self) -> List[Dict]:
        """Get all available permissions grouped by module"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, name, module, description
            FROM permissions
            ORDER BY module, name
        ''')

        permissions = []
        for row in cursor.fetchall():
            permissions.append({
                "id": row[0],
                "name": row[1],
                "module": row[2],
                "description": row[3]
            })

        conn.close()
        return permissions

    def get_role_by_id(self, role_id: int) -> Optional[Dict]:
        """Get role by ID"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, is_system_role, created_at
            FROM roles WHERE id = ?
        ''', (role_id,))
        
        role = cursor.fetchone()
        conn.close()
        
        if role:
            return {
                "id": role[0],
                "name": role[1],
                "description": role[2],
                "is_system_role": bool(role[3]),
                "created_at": role[4]
            }
        return None

    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, password_hash, full_name, role_id, is_active, created_at, last_login, profile_image
            FROM users WHERE username = ?
        ''', (username,))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "password_hash": user[3],
                "full_name": user[4],
                "role_id": user[5],
                "is_active": bool(user[6]),
                "created_at": user[7],
                "last_login": user[8],
                "profile_image": user[9]
            }
        return None

    def update_user_profile(self, user_id: int, full_name: str = None, email: str = None, username: str = None) -> Optional[Dict]:
        """Update user profile information"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
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
                SELECT id, username, email, password_hash, full_name, role_id, is_active, created_at, last_login, profile_image
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
                    "role_id": user[5],
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
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
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
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
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

# Global instance
user_db = UserManagementDB()
