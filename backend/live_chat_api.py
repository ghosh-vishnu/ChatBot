from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from auth_router import verify_token

router = APIRouter(prefix="/chat")
security = HTTPBearer()

# Pydantic Models
class ChatRequestCreate(BaseModel):
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    category_id: int
    message: Optional[str] = None

class ChatRequestResponse(BaseModel):
    id: int
    user_name: Optional[str]
    user_email: Optional[str]
    category_name: str
    message: Optional[str]
    status: str
    created_at: str
    expires_at: str

class ChatMessage(BaseModel):
    session_id: int
    sender_type: str
    sender_id: str
    message: str
    message_type: str = "text"
    created_at: str

class ChatSession(BaseModel):
    id: int
    request_id: int
    user_id: str
    support_user_id: int
    status: str
    started_at: str
    ended_at: Optional[str]

# Database connection
def get_db_connection():
    conn = sqlite3.connect('venturing.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict = {}  # user_id -> WebSocket
        self.support_connections: dict = {}  # support_user_id -> WebSocket

    async def connect(self, websocket: WebSocket, user_id: str, user_type: str = "user"):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if user_type == "user":
            self.user_connections[user_id] = websocket
        else:
            self.support_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str, user_type: str = "user"):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if user_type == "user" and user_id in self.user_connections:
            del self.user_connections[user_id]
        elif user_type == "support" and user_id in self.support_connections:
            del self.support_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def send_to_user(self, user_id: str, message: str):
        if user_id in self.user_connections:
            await self.user_connections[user_id].send_text(message)

    async def send_to_support(self, support_user_id: str, message: str):
        print(f"Attempting to send to support_user_id: {support_user_id}")
        print(f"Available support connections: {list(self.support_connections.keys())}")
        if support_user_id in self.support_connections:
            print(f"Sending message to support {support_user_id}")
            await self.support_connections[support_user_id].send_text(message)
        else:
            print(f"Support user {support_user_id} not connected")

    async def broadcast_to_support(self, message: str):
        for connection in self.support_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

# API Endpoints

@router.get("/categories")
async def get_chat_categories():
    """Get available chat categories"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, description 
        FROM chat_categories 
        WHERE is_active = 1 
        ORDER BY name
    """)
    
    categories = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {"categories": categories}

@router.post("/request")
async def create_chat_request(request: ChatRequestCreate):
    """Create a new chat request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Generate anonymous user ID
    user_id = f"user_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(request.user_email or 'anonymous') % 10000}"
    
    # Insert chat request
    cursor.execute("""
        INSERT INTO chat_requests (user_id, user_name, user_email, category_id, message, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        request.user_name,
        request.user_email,
        request.category_id,
        request.message,
        (datetime.now() + timedelta(minutes=10)).isoformat()
    ))
    
    request_id = cursor.lastrowid
    
    # Get category name
    cursor.execute("SELECT name FROM chat_categories WHERE id = ?", (request.category_id,))
    category_result = cursor.fetchone()
    category_name = category_result["name"] if category_result else "Unknown Category"
    
    conn.commit()
    conn.close()
    
    # Broadcast to all support users
    notification = {
        "type": "new_chat_request",
        "data": {
            "request_id": request_id,
            "user_name": request.user_name or "Anonymous",
            "category_name": category_name,
            "message": request.message or "No message provided",
            "created_at": datetime.now().isoformat()
        }
    }
    
    await manager.broadcast_to_support(json.dumps(notification))
    
    # Create notification for admin dashboard
    try:
        from notification_stream import broadcast_new_notification
        
        notification_data = {
            "title": "New Live Chat Request",
            "message": f"Chat request from {request.user_name or request.user_email or 'Anonymous'} - {category_name}",
            "type": "chat_request",
            "related_id": request_id
        }
        
        # Store notification in database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO notifications (title, message, type, related_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            notification_data["title"],
            notification_data["message"],
            notification_data["type"],
            notification_data["related_id"],
            datetime.now().isoformat()
        ))
        
        notification_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Broadcast notification to all connected admins
        import asyncio
        asyncio.create_task(broadcast_new_notification({
            "id": notification_id,
            "title": notification_data["title"],
            "message": notification_data["message"],
            "type": notification_data["type"],
            "related_id": notification_data["related_id"],
            "is_read": 0,
            "created_at": datetime.now().isoformat()
        }))
    except Exception as e:
        print(f"Notification creation error: {e}")
        # Continue without notification if it fails
    
    return {
        "success": True,
        "request_id": request_id,
        "user_id": user_id,
        "message": "Chat request created successfully. Waiting for support agent..."
    }

@router.get("/requests")
async def get_chat_requests(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get pending chat requests (for support users)"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cr.*, cc.name as category_name
        FROM chat_requests cr
        JOIN chat_categories cc ON cr.category_id = cc.id
        WHERE cr.status = 'pending' AND cr.expires_at > datetime('now')
        ORDER BY cr.created_at ASC
    """)
    
    requests = []
    for row in cursor.fetchall():
        requests.append({
            "id": row["id"],
            "user_name": row["user_name"] or "Anonymous",
            "user_email": row["user_email"],
            "category_name": row["category_name"],
            "message": row["message"],
            "created_at": row["created_at"],
            "expires_at": row["expires_at"]
        })
    
    conn.close()
    return {"requests": requests}

@router.post("/requests/{request_id}/accept")
async def accept_chat_request(request_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Accept a chat request"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    # Extract user ID properly
    user_id = user.get("id") or user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found in token")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if request exists and is pending
    cursor.execute("""
        SELECT * FROM chat_requests 
        WHERE id = ? AND status = 'pending' AND expires_at > datetime('now')
    """, (request_id,))
    
    request = cursor.fetchone()
    if not request:
        raise HTTPException(status_code=404, detail="Chat request not found or expired")
    
    # Update request status
    cursor.execute("""
        UPDATE chat_requests 
        SET status = 'accepted', assigned_to = ?, accepted_at = ?
        WHERE id = ?
    """, (user_id, datetime.now().isoformat(), request_id))
    
    # Create chat session
    cursor.execute("""
        INSERT INTO chat_sessions (request_id, user_id, support_user_id)
        VALUES (?, ?, ?)
    """, (request_id, request["user_id"], user_id))
    
    session_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    # Notify user
    await manager.send_to_user(request["user_id"], json.dumps({
        "type": "chat_accepted",
        "data": {
            "session_id": session_id,
            "support_user_id": user_id,
            "support_name": user.get("full_name", "Support Agent"),
            "message": "Your chat request has been accepted. You can now start chatting!"
        }
    }))
    
    return {
        "success": True,
        "session_id": session_id,
        "user_id": request["user_id"],
        "support_user_id": user_id,
        "message": "Chat request accepted successfully"
    }

@router.post("/requests/{request_id}/reject")
async def reject_chat_request(request_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Reject a chat request"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if request exists and is pending
    cursor.execute("""
        SELECT * FROM chat_requests 
        WHERE id = ? AND status = 'pending'
    """, (request_id,))
    
    request = cursor.fetchone()
    if not request:
        raise HTTPException(status_code=404, detail="Chat request not found")
    
    # Update request status
    cursor.execute("""
        UPDATE chat_requests 
        SET status = 'rejected', assigned_to = ?, rejected_at = ?
        WHERE id = ?
    """, (user.get("id") or user.get("user_id"), datetime.now().isoformat(), request_id))
    
    conn.commit()
    conn.close()
    
    # Notify user
    await manager.send_to_user(request["user_id"], json.dumps({
        "type": "chat_rejected",
        "data": {
            "message": "Currently no support available. Please raise a ticket or try again later."
        }
    }))
    
    return {
        "success": True,
        "message": "Chat request rejected"
    }

@router.get("/sessions")
async def get_chat_sessions(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get active chat sessions for support user"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cs.*, cr.user_name, cr.user_email, cc.name as category_name
        FROM chat_sessions cs
        JOIN chat_requests cr ON cs.request_id = cr.id
        JOIN chat_categories cc ON cr.category_id = cc.id
        WHERE cs.support_user_id = ? AND cs.status = 'active'
        ORDER BY cs.started_at DESC
    """, (user.get("id") or user.get("user_id"),))
    
    sessions = []
    for row in cursor.fetchall():
        sessions.append({
            "id": row["id"],
            "request_id": row["request_id"],
            "user_id": row["user_id"],
            "user_name": row["user_name"] or "Anonymous",
            "user_email": row["user_email"],
            "category_name": row["category_name"],
            "started_at": row["started_at"]
        })
    
    conn.close()
    return {"sessions": sessions}

@router.get("/sessions/{session_id}/messages/public")
async def get_chat_messages_public(session_id: int):
    """Get messages for a chat session (public endpoint for users)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get messages for this session
    cursor.execute("""
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
    """, (session_id,))
    
    messages = []
    for row in cursor.fetchall():
        messages.append({
            "id": row[0],
            "session_id": row[1],
            "sender_type": row[2],
            "sender_id": row[3],
            "message": row[4],
            "message_type": row[5],
            "is_read": bool(row[6]),
            "created_at": row[7]
        })
    
    conn.close()
    return {"messages": messages}

@router.get("/sessions/{session_id}/messages")
async def get_chat_messages(session_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get messages for a chat session"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify user has access to this session
    cursor.execute("""
        SELECT * FROM chat_sessions 
        WHERE id = ? AND (support_user_id = ? OR user_id = ?)
    """, (session_id, user.get("id") or user.get("user_id"), user.get("user_id", "")))
    
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get messages
    cursor.execute("""
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
    """, (session_id,))
    
    messages = []
    for row in cursor.fetchall():
        messages.append({
            "id": row["id"],
            "sender_type": row["sender_type"],
            "sender_id": row["sender_id"],
            "message": row["message"],
            "message_type": row["message_type"],
            "is_read": bool(row["is_read"]),
            "created_at": row["created_at"]
        })
    
    conn.close()
    return {"messages": messages}

# WebSocket endpoint for real-time chat
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id, "user")
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            print(f"User WebSocket received: {message_data}")
            
            if message_data["type"] == "chat_message":
                print(f"Processing chat message from user: {message_data}")
                # Save message to database
                conn = get_db_connection()
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO chat_messages (session_id, sender_type, sender_id, message, message_type)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    message_data["session_id"],
                    message_data["sender_type"],
                    message_data["sender_id"],
                    message_data["message"],
                    message_data.get("message_type", "text")
                ))
                
                conn.commit()
                conn.close()
                
                # Get session details to forward message to correct participants
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT user_id, support_user_id FROM chat_sessions 
                    WHERE id = ?
                """, (message_data["session_id"],))
                session = cursor.fetchone()
                conn.close()
                
                if session:
                    print(f"Session found: user_id={session[0]}, support_user_id={session[1]}")
                    # Forward message to other participant
                    if message_data["sender_type"] == "user":
                        # User sent message, forward to support
                        print(f"Forwarding user message to support_user_id: {session[1]}")
                        await manager.send_to_support(str(session[1]), data)
                    else:
                        # Support sent message, forward to user
                        print(f"Forwarding support message to user_id: {session[0]}")
                        await manager.send_to_user(session[0], data)
                else:
                    print(f"No session found for session_id: {message_data['session_id']}")
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, "user")

@router.websocket("/ws/support/{support_user_id}")
async def support_websocket_endpoint(websocket: WebSocket, support_user_id: str):
    await manager.connect(websocket, support_user_id, "support")
    print(f"Support WebSocket connected for support_user_id: {support_user_id}")
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            print(f"Support WebSocket received: {message_data}")
            
            if message_data["type"] == "chat_message":
                print(f"Processing chat message from support: {message_data}")
                # Save message to database
                conn = get_db_connection()
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO chat_messages (session_id, sender_type, sender_id, message, message_type)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    message_data["session_id"],
                    message_data["sender_type"],
                    message_data["sender_id"],
                    message_data["message"],
                    message_data.get("message_type", "text")
                ))
                
                conn.commit()
                conn.close()
                
                # Get session details to forward message to correct participants
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT user_id, support_user_id FROM chat_sessions 
                    WHERE id = ?
                """, (message_data["session_id"],))
                session = cursor.fetchone()
                conn.close()
                
                if session:
                    # Forward message to user
                    await manager.send_to_user(session[0], data)
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket, support_user_id, "support")
