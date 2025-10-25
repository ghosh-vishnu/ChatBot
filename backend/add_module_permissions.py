#!/usr/bin/env python3
"""
Script to add module-specific permissions to the database
"""

import sqlite3
from user_management_db import UserManagementDB

def add_module_permissions():
    """Add detailed module permissions to the database"""
    db = UserManagementDB()
    
    # Module-specific permissions
    module_permissions = {
        'overview': [
            ('overview_view', 'Overview', 'Access to main dashboard overview'),
            ('overview_metrics', 'Overview', 'See key performance indicators'),
            ('overview_stats', 'Overview', 'Access to statistical data')
        ],
        'analytics': [
            ('analytics_view', 'Analytics', 'Access to analytics dashboard'),
            ('analytics_reports', 'Analytics', 'Create and download reports'),
            ('analytics_export', 'Analytics', 'Export analytics data'),
            ('analytics_realtime', 'Analytics', 'View real-time analytics')
        ],
        'faq': [
            ('faq_view', 'FAQ Management', 'Read FAQ articles'),
            ('faq_create', 'FAQ Management', 'Add new FAQ articles'),
            ('faq_edit', 'FAQ Management', 'Modify existing FAQs'),
            ('faq_delete', 'FAQ Management', 'Remove FAQ articles'),
            ('faq_categories', 'FAQ Management', 'Organize FAQ categories')
        ],
        'tickets': [
            ('tickets_view', 'Ticket Management', 'See support tickets'),
            ('tickets_assign', 'Ticket Management', 'Assign tickets to agents'),
            ('tickets_resolve', 'Ticket Management', 'Mark tickets as resolved'),
            ('tickets_priority', 'Ticket Management', 'Change ticket priority'),
            ('tickets_escalate', 'Ticket Management', 'Escalate to higher level')
        ],
        'livechat': [
            ('livechat_view', 'Live Chat', 'Access live chat interface'),
            ('livechat_respond', 'Live Chat', 'Reply to customer chats'),
            ('livechat_transfer', 'Live Chat', 'Transfer chats to other agents'),
            ('livechat_end', 'Live Chat', 'End chat sessions')
        ],
        'chatmanagement': [
            ('chat_categories', 'Chat Management', 'Create/edit chat categories'),
            ('chat_subcategories', 'Chat Management', 'Organize subcategories'),
            ('chat_settings', 'Chat Management', 'Configure chat settings'),
            ('chat_agents', 'Chat Management', 'Assign chat agents')
        ],
    'reports': [
        ('reports_view_summary', 'Reports', 'Access Total FAQs, Conversations, Success Rate, Total Views'),
        ('reports_download_conversations', 'Reports', 'Download chat conversations in Excel format'),
        ('reports_download_analytics', 'Reports', 'Download analytics data in Excel format'),
        ('reports_faq_performance', 'Reports', 'Access FAQ performance metrics and rankings'),
        ('reports_category_performance', 'Reports', 'Access category-wise performance charts and data'),
        ('reports_generate_faq_report', 'Reports', 'Generate and download FAQ performance reports')
    ],
        'users': [
            ('users_view', 'User Management', 'See user list'),
            ('users_create', 'User Management', 'Add new users'),
            ('users_edit', 'User Management', 'Modify user details'),
            ('users_delete', 'User Management', 'Remove users'),
            ('users_roles', 'User Management', 'Assign user roles'),
            ('users_permissions', 'User Management', 'Set user permissions')
        ]
    }
    
    conn = sqlite3.connect(db.db_path, check_same_thread=False)
    cursor = conn.cursor()
    
    try:
        # Add all module permissions
        for module, permissions in module_permissions.items():
            for perm_name, module_name, description in permissions:
                # Check if permission already exists
                cursor.execute("SELECT id FROM permissions WHERE name = ?", (perm_name,))
                if not cursor.fetchone():
                    cursor.execute('''
                        INSERT INTO permissions (name, module, description)
                        VALUES (?, ?, ?)
                    ''', (perm_name, module_name, description))
                    print(f"Added permission: {perm_name}")
                else:
                    print(f"Permission already exists: {perm_name}")
        
        conn.commit()
        print("✅ All module permissions added successfully!")
        
    except Exception as e:
        print(f"❌ Error adding permissions: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_module_permissions()
