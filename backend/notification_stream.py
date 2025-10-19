#!/usr/bin/env python3
"""
Real-time notification streaming using Server-Sent Events (SSE)
"""
import asyncio
import json
import sqlite3
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlite_auth import SQLiteAuth
from ticket_database import TicketDatabase

# Initialize database connections
db_auth = SQLiteAuth()
ticket_db = TicketDatabase()
security = HTTPBearer()

class NotificationStream:
    def __init__(self):
        self.connections = set()
        self.last_notification_id = 0
        
    def add_connection(self, connection):
        self.connections.add(connection)
        
    def remove_connection(self, connection):
        self.connections.discard(connection)
        
    async def broadcast_notification(self, notification):
        """Broadcast notification to all connected clients"""
        if self.connections:
            message = f"data: {json.dumps(notification)}\n\n"
            disconnected = set()
            
            for connection in self.connections:
                try:
                    await connection.put(message)
                except:
                    disconnected.add(connection)
            
            # Remove disconnected connections
            for connection in disconnected:
                self.connections.discard(connection)
    
    def get_latest_notifications(self, limit=10):
        """Get latest notifications from database"""
        try:
            conn = sqlite3.connect(ticket_db.db_path, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM notifications 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (limit,))
            notifications = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return notifications
        except Exception as e:
            print(f"Error fetching notifications: {e}")
            return []

# Global notification stream instance
notification_stream = NotificationStream()

async def get_current_user_from_token(token: str):
    """Get current authenticated user from token"""
    try:
        payload = db_auth.verify_token(token)
        if payload is None:
            return None
        
        username = payload.get("sub")
        if not username:
            return None
        
        user = db_auth.get_user_by_username(username)
        if not user:
            return None
        
        return user
    except Exception as e:
        return None

async def notification_generator():
    """Generator for Server-Sent Events"""
    # Create a queue for this connection
    connection_queue = asyncio.Queue()
    notification_stream.add_connection(connection_queue)
    
    try:
        # Send initial connection confirmation
        yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected to notifications'})}\n\n"
        
        # Send latest notifications on connection
        latest_notifications = notification_stream.get_latest_notifications()
        for notification in latest_notifications:
            yield f"data: {json.dumps({'type': 'notification', 'data': notification})}\n\n"
        
        # Keep connection alive and send new notifications
        while True:
            try:
                # Wait for new notification with timeout
                message = await asyncio.wait_for(connection_queue.get(), timeout=30.0)
                yield message
            except asyncio.TimeoutError:
                # Send keep-alive ping
                yield f"data: {json.dumps({'type': 'ping', 'timestamp': datetime.now().isoformat()})}\n\n"
                
    except Exception as e:
        print(f"Error in notification generator: {e}")
    finally:
        notification_stream.remove_connection(connection_queue)

def create_notification_routes(app: FastAPI):
    """Create notification-related routes"""
    
    @app.get("/admin/notifications/stream")
    async def stream_notifications(token: str = None):
        """Stream real-time notifications using Server-Sent Events"""
        if not token:
            raise HTTPException(status_code=401, detail="Token required")
        
        try:
            user = await get_current_user_from_token(token)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
        except Exception as e:
            print(f"Token verification error: {e}")
            raise HTTPException(status_code=401, detail="Token verification failed")
        
        return StreamingResponse(
            notification_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
    
    @app.post("/admin/notifications/clear")
    async def clear_all_notifications(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Clear all notifications"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            conn = sqlite3.connect(ticket_db.db_path, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notifications")
            conn.commit()
            conn.close()
            
            # Broadcast clear event
            await notification_stream.broadcast_notification({
                'type': 'notifications_cleared',
                'message': 'All notifications have been cleared'
            })
            
            return {"message": "All notifications cleared successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.delete("/admin/notifications/{notification_id}")
    async def delete_notification(notification_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Delete a specific notification"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            conn = sqlite3.connect(ticket_db.db_path, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
            conn.commit()
            conn.close()
            
            if cursor.rowcount > 0:
                # Broadcast deletion event
                await notification_stream.broadcast_notification({
                    'type': 'notification_deleted',
                    'notification_id': notification_id
                })
                
                return {"message": "Notification deleted successfully"}
            else:
                raise HTTPException(status_code=404, detail="Notification not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.put("/admin/notifications/{notification_id}/read")
    async def mark_notification_read(notification_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Mark a notification as read"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            success = ticket_db.mark_notification_read(notification_id)
            if success:
                # Broadcast read event
                await notification_stream.broadcast_notification({
                    'type': 'notification_read',
                    'notification_id': notification_id
                })
                
                return {"message": "Notification marked as read"}
            else:
                raise HTTPException(status_code=404, detail="Notification not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # User notification endpoints
    @app.get("/user/notifications/stream")
    async def stream_user_notifications(token: str = None):
        """Stream real-time notifications for users using Server-Sent Events"""
        if not token:
            raise HTTPException(status_code=401, detail="Token required")
        
        user = await get_current_user_from_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return StreamingResponse(
            notification_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
    
    @app.get("/user/notifications")
    async def get_user_notifications(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Get all notifications for users"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            notifications = ticket_db.get_notifications(is_read=False)
            return {"notifications": notifications}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/user/notifications/count")
    async def get_user_notification_count(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Get unread notification count for users"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            count = ticket_db.get_unread_notification_count()
            return {"unread_count": count}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/user/notifications/clear")
    async def clear_all_user_notifications(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Clear all notifications for users"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            conn = sqlite3.connect(ticket_db.db_path, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notifications")
            conn.commit()
            conn.close()
            
            # Broadcast clear event
            await notification_stream.broadcast_notification({
                'type': 'notifications_cleared',
                'message': 'All notifications have been cleared'
            })
            
            return {"message": "All notifications cleared successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.delete("/user/notifications/{notification_id}")
    async def delete_user_notification(notification_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Delete a specific notification for users"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            conn = sqlite3.connect(ticket_db.db_path, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
            conn.commit()
            conn.close()
            
            if cursor.rowcount > 0:
                # Broadcast deletion event
                await notification_stream.broadcast_notification({
                    'type': 'notification_deleted',
                    'notification_id': notification_id
                })
                
                return {"message": "Notification deleted successfully"}
            else:
                raise HTTPException(status_code=404, detail="Notification not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.put("/user/notifications/{notification_id}/read")
    async def mark_user_notification_read(notification_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Mark a notification as read for users"""
        try:
            user = await get_current_user_from_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            success = ticket_db.mark_notification_read(notification_id)
            if success:
                # Broadcast read event
                await notification_stream.broadcast_notification({
                    'type': 'notification_read',
                    'notification_id': notification_id
                })
                
                return {"message": "Notification marked as read"}
            else:
                raise HTTPException(status_code=404, detail="Notification not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# Function to broadcast new notifications (to be called from other parts of the app)
async def broadcast_new_notification(notification_type: str, title: str, message: str, ticket_token: str = None):
    """Broadcast a new notification to all connected clients"""
    try:
        # Create notification in database
        notification = ticket_db.create_notification(notification_type, title, message, ticket_token)
        
        # Broadcast to all connected clients
        await notification_stream.broadcast_notification({
            'type': 'new_notification',
            'data': notification
        })
        
        return notification
    except Exception as e:
        print(f"Error broadcasting notification: {e}")
        return None
