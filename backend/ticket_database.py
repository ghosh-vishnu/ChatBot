import sqlite3
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
import asyncio

class TicketDatabase:
    def __init__(self, db_path: str = "venturing.db"):
        self.db_path = db_path
        self.conn = None
        self.cursor = None

    def _get_db_connection(self):
        if self.conn is None:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row
        return self.conn

    def init_database(self):
        """Initialize ticket database tables"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Create tickets table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token TEXT UNIQUE NOT NULL,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT,
                    user_query TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    resolved_at TEXT,
                    admin_notes TEXT
                )
            """)
            
            # Create ticket_responses table for admin responses
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ticket_responses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_token TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    response_by TEXT DEFAULT 'admin',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (ticket_token) REFERENCES tickets (token)
                )
            """)
            
            # Create notifications table for admin notifications
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    ticket_token TEXT,
                    is_read INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (ticket_token) REFERENCES tickets (token)
                )
            """)
            
            conn.commit()
            print("Ticket database initialized successfully")

    def generate_ticket_token(self) -> str:
        """Generate a unique ticket token"""
        return f"TKT-{uuid.uuid4().hex[:8].upper()}"

    def create_ticket(self, first_name: str, last_name: str, email: str, user_query: str, phone: Optional[str] = None) -> Dict[str, Any]:
        """Create a new ticket"""
        token = self.generate_ticket_token()
        now = datetime.now().isoformat()
        
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO tickets (token, first_name, last_name, email, phone, user_query, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (token, first_name, last_name, email, phone, user_query, now, now))
            conn.commit()
            
            
            # Send email notification to user
            try:
                from simple_email import send_ticket_confirmation_email
                send_ticket_confirmation_email(
                    to_email=email,
                    ticket_token=token,
                    user_name=f"{first_name} {last_name}",
                    user_query=user_query
                )
            except Exception as e:
                print(f"⚠️ Email notification failed for {email}: {str(e)}")
            
            # Get the created ticket
            cursor.execute("SELECT * FROM tickets WHERE token = ?", (token,))
            ticket = cursor.fetchone()
            return dict(ticket)

    def get_ticket_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get ticket by token"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tickets WHERE token = ?", (token,))
            ticket = cursor.fetchone()
            return dict(ticket) if ticket else None

    def get_all_tickets(self) -> List[Dict[str, Any]]:
        """Get all tickets (for admin)"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tickets ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def update_ticket_status(self, token: str, status: str, admin_notes: Optional[str] = None) -> bool:
        """Update ticket status"""
        now = datetime.now().isoformat()
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get ticket details before updating
            cursor.execute("SELECT * FROM tickets WHERE token = ?", (token,))
            ticket = cursor.fetchone()
            
            cursor.execute("""
                UPDATE tickets 
                SET status = ?, updated_at = ?, admin_notes = ?, resolved_at = ?
                WHERE token = ?
            """, (status, now, admin_notes, now if status == 'resolved' else None, token))
            conn.commit()
            
            # Send email notification to user if ticket is resolved
            if cursor.rowcount > 0 and status == 'resolved' and ticket:
                try:
                    from simple_email import send_ticket_resolution_email
                    asyncio.create_task(send_ticket_resolution_email(
                        to_email=ticket['email'],
                        ticket_token=token,
                        user_name=f"{ticket['first_name']} {ticket['last_name']}",
                        resolution_notes=admin_notes
                    ))
                except Exception as e:
                    print(f"⚠️ Resolution email notification failed for {ticket['email']}: {str(e)}")
            
            return cursor.rowcount > 0

    def add_ticket_response(self, token: str, response_text: str, response_by: str = 'admin') -> bool:
        """Add response to ticket"""
        now = datetime.now().isoformat()
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ticket_responses (ticket_token, response_text, response_by, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (token, response_text, response_by, now))
            conn.commit()
            return True

    def get_ticket_responses(self, token: str) -> List[Dict[str, Any]]:
        """Get all responses for a ticket"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM ticket_responses 
                WHERE ticket_token = ? 
                ORDER BY created_at ASC
            """, (token,))
            return [dict(row) for row in cursor.fetchall()]

    def create_notification(self, notification_type: str, title: str, message: str, ticket_token: str = None) -> Dict[str, Any]:
        """Create a new notification"""
        now = datetime.now().isoformat()
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO notifications (type, title, message, ticket_token, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (notification_type, title, message, ticket_token, now))
            conn.commit()
            
            # Get the created notification
            cursor.execute("SELECT * FROM notifications WHERE id = ?", (cursor.lastrowid,))
            notification = cursor.fetchone()
            return dict(notification)

    def get_notifications(self, is_read: bool = False) -> List[Dict[str, Any]]:
        """Get all notifications (for admin)"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM notifications 
                WHERE is_read = ? 
                ORDER BY created_at DESC
            """, (1 if is_read else 0,))
            return [dict(row) for row in cursor.fetchall()]

    def mark_notification_read(self, notification_id: int) -> bool:
        """Mark a notification as read"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_ticket(self, token: str) -> bool:
        """Delete a ticket and its related data"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            try:
                # Delete ticket responses first (foreign key constraint)
                cursor.execute("DELETE FROM ticket_responses WHERE ticket_token = ?", (token,))
                
                # Delete notifications related to this ticket
                cursor.execute("DELETE FROM notifications WHERE ticket_token = ?", (token,))
                
                # Delete the ticket
                cursor.execute("DELETE FROM tickets WHERE token = ?", (token,))
                
                conn.commit()
                return cursor.rowcount > 0
            except Exception as e:
                print(f"Error deleting ticket {token}: {e}")
                return False

    def get_unread_notification_count(self) -> int:
        """Get count of unread notifications"""
        with self._get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
            return cursor.fetchone()[0]

# Global instance
ticket_db = TicketDatabase()
