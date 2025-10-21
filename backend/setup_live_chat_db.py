#!/usr/bin/env python3
"""
Database setup script for Live Chat feature
Run this script to create the necessary tables for live chat functionality
"""

import sqlite3
import os

def setup_live_chat_tables():
    """Create live chat tables in the database"""
    
    # Connect to database
    db_path = 'venturing.db'
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    
    try:
        # Create chat categories table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create chat requests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                user_name TEXT,
                user_email TEXT,
                category_id INTEGER,
                message TEXT,
                status TEXT DEFAULT 'pending',
                assigned_to INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accepted_at DATETIME,
                rejected_at DATETIME,
                expires_at DATETIME DEFAULT (datetime('now', '+10 minutes')),
                FOREIGN KEY (category_id) REFERENCES chat_categories(id),
                FOREIGN KEY (assigned_to) REFERENCES users(id)
            )
        """)
        
        # Create chat sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                support_user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'active',
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                FOREIGN KEY (request_id) REFERENCES chat_requests(id),
                FOREIGN KEY (support_user_id) REFERENCES users(id)
            )
        """)
        
        # Create chat messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                sender_type TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                message TEXT NOT NULL,
                message_type TEXT DEFAULT 'text',
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
            )
        """)
        
        # Insert default chat categories
        categories = [
            ('General Support', 'General questions and support'),
            ('Technical Issues', 'Technical problems and bugs'),
            ('Account Help', 'Account-related questions'),
            ('Billing & Pricing', 'Billing and pricing inquiries'),
            ('Feature Request', 'Suggestions for new features'),
            ('Other', 'Other topics not covered above')
        ]
        
        for name, description in categories:
            cursor.execute("""
                INSERT OR IGNORE INTO chat_categories (name, description) 
                VALUES (?, ?)
            """, (name, description))
        
        # Commit changes
        conn.commit()
        print("✅ Live Chat tables created successfully!")
        print("📋 Categories inserted:", len(categories))
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
    finally:
        conn.close()

def verify_tables():
    """Verify that all tables were created correctly"""
    conn = sqlite3.connect('venturing.db', check_same_thread=False)
    cursor = conn.cursor()
    
    try:
        # Check if tables exist
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('chat_categories', 'chat_requests', 'chat_sessions', 'chat_messages')
        """)
        
        tables = cursor.fetchall()
        print(f"📊 Tables created: {len(tables)}")
        for table in tables:
            print(f"   - {table[0]}")
        
        # Check categories
        cursor.execute("SELECT COUNT(*) FROM chat_categories")
        count = cursor.fetchone()[0]
        print(f"📋 Categories available: {count}")
        
    except Exception as e:
        print(f"❌ Error verifying tables: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Setting up Live Chat database tables...")
    setup_live_chat_tables()
    verify_tables()
    print("✨ Setup complete!")
