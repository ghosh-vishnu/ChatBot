from __future__ import annotations

import json
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from auth_router import verify_token

router = APIRouter(prefix="/chat")
security = HTTPBearer()

# Pydantic Models
class ChatRequestCreate(BaseModel):
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    category_id: int
    subcategory_id: Optional[int] = None
    message: Optional[str] = None

class FeedbackCreate(BaseModel):
    session_id: int
    user_id: str
    admin_user_id: int
    overall_rating: int
    support_quality: int
    response_time: int
    comments: Optional[str] = None
    would_recommend: bool

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

def save_message_to_json(session_id: int, sender_type: str, sender_id: str, message: str, message_type: str = "text"):
    """Save message to database in JSON format"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if session already has messages
    cursor.execute("""
        SELECT messages_json, message_count FROM chat_messages 
        WHERE session_id = ?
    """, (session_id,))
    
    existing = cursor.fetchone()
    
    if existing:
        # Update existing session
        messages_data = json.loads(existing[0])
        messages_data.append({
            "sender_type": sender_type,
            "sender_id": sender_id,
            "message": message,
            "message_type": message_type,
            "created_at": datetime.now().isoformat()
        })
        
        cursor.execute("""
            UPDATE chat_messages 
            SET messages_json = ?, message_count = ?, last_message = ?, 
                last_sender = ?, updated_at = ?
            WHERE session_id = ?
        """, (
            json.dumps(messages_data),
            len(messages_data),
            message,
            sender_type,
            datetime.now().isoformat(),
            session_id
        ))
    else:
        # Create new session
        messages_data = [{
            "sender_type": sender_type,
            "sender_id": sender_id,
            "message": message,
            "message_type": message_type,
            "created_at": datetime.now().isoformat()
        }]
        
        cursor.execute("""
            INSERT INTO chat_messages 
            (session_id, messages_json, message_count, last_message, last_sender, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            json.dumps(messages_data),
            1,
            message,
            sender_type,
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
    
    conn.commit()
    conn.close()

async def timeout_chat_request(request_id: int, user_id: str):
    """Timeout a chat request after 120 seconds (2 minutes) if not accepted"""
    await asyncio.sleep(120)  # Wait 120 seconds (2 minutes)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if request is still pending
    cursor.execute("SELECT status FROM chat_requests WHERE id = ?", (request_id,))
    result = cursor.fetchone()
    
    if result and result['status'] == 'pending':
        # Timeout the request
        cursor.execute("""
            UPDATE chat_requests 
            SET status = 'timeout', 
                rejected_at = CURRENT_TIMESTAMP,
                rejection_reason = 'Request timed out - no support agent available'
            WHERE id = ?
        """, (request_id,))
        conn.commit()
        
        # Notify user about timeout
        timeout_message = {
            "type": "request_timeout",
            "data": {
                "message": "Your chat request has timed out as no support agent was available. We apologize for the inconvenience. Please try again later or create a support ticket for immediate assistance.",
                "request_id": request_id
            }
        }
        await manager.send_to_user(user_id, json.dumps(timeout_message))
    
    conn.close()

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
        if support_user_id in self.support_connections:
            await self.support_connections[support_user_id].send_text(message)

    async def broadcast_to_support(self, message: str):
        for connection in self.support_connections.values():
            await connection.send_text(message)

    async def broadcast_to_session(self, session_id: int, message: str):
        """Broadcast message to all users in a specific session"""
        # Send to all user connections (since we don't track session-specific connections)
        for connection in self.user_connections.values():
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

@router.get("/subcategories/{category_id}")
async def get_subcategories_by_category(category_id: int):
    """Get subcategories for a specific category (public endpoint)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, category_id, name, description, is_active
        FROM chat_subcategories 
        WHERE category_id = ? AND is_active = 1
        ORDER BY name
    """, (category_id,))
    
    subcategories = []
    for row in cursor.fetchall():
        subcategories.append({
            "id": row["id"],
            "category_id": row["category_id"],
            "name": row["name"],
            "description": row["description"],
            "is_active": bool(row["is_active"])
        })
    
    conn.close()
    return subcategories

@router.post("/request")
async def create_chat_request(request: ChatRequestCreate, background_tasks: BackgroundTasks):
    """Create a new chat request"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Generate anonymous user ID
    user_id = f"user_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(request.user_email or 'anonymous') % 10000}"
    
    # Insert chat request
    cursor.execute("""
        INSERT INTO chat_requests (user_id, user_name, user_email, category_id, subcategory_id, message, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        request.user_name,
        request.user_email,
        request.category_id,
        request.subcategory_id,
        request.message,
        (datetime.now() + timedelta(minutes=10)).isoformat()
    ))
    
    request_id = cursor.lastrowid
    
    # Get category name
    cursor.execute("SELECT name FROM chat_categories WHERE id = ?", (request.category_id,))
    category_result = cursor.fetchone()
    category_name = category_result["name"] if category_result else "Unknown Category"
    
    # Get subcategory name if provided
    subcategory_name = None
    if request.subcategory_id:
        cursor.execute("SELECT name FROM chat_subcategories WHERE id = ?", (request.subcategory_id,))
        subcategory_result = cursor.fetchone()
        subcategory_name = subcategory_result["name"] if subcategory_result else None
    
    conn.commit()
    conn.close()
    
    # Broadcast to all support users
    notification = {
        "type": "new_chat_request",
        "data": {
            "request_id": request_id,
            "user_name": request.user_name or "Anonymous",
            "category_name": category_name,
            "subcategory_name": subcategory_name,
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
        # Continue without notification if it fails
        pass
    
    # Start timeout task
    background_tasks.add_task(timeout_chat_request, request_id, user_id)
    
    return {
        "success": True,
        "request_id": request_id,
        "user_id": user_id,
        "category_name": category_name,
        "subcategory_name": subcategory_name,
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
        SELECT cr.*, cc.name as category_name, cs.name as subcategory_name
        FROM chat_requests cr
        JOIN chat_categories cc ON cr.category_id = cc.id
        LEFT JOIN chat_subcategories cs ON cr.subcategory_id = cs.id
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
            "subcategory_name": row["subcategory_name"],
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
    
    # Create chat session with proper support user ID and local time
    # user_id is the actual logged-in support agent's ID
    cursor.execute("""
        INSERT INTO chat_sessions (request_id, user_id, support_user_id, started_at_local)
        VALUES (?, ?, ?, datetime('now', 'localtime'))
    """, (request_id, request["user_id"], user_id))
    
    session_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    # Get support agent name dynamically
    support_name = user.get("full_name") or user.get("username") or "Support Agent"
    
    # Notify user
    notification_data = {
        "type": "chat_accepted",
        "data": {
            "session_id": session_id,
            "support_user_id": user_id,
            "support_name": support_name,
            "user_name": request["user_name"] if request["user_name"] else "User",
            "message": "Your chat request has been accepted. You can now start chatting!"
        }
    }
    await manager.send_to_user(request["user_id"], json.dumps(notification_data))
    
    return {
        "success": True,
        "session_id": session_id,
        "user_id": request["user_id"],
        "support_user_id": user_id,
        "message": "Chat request accepted successfully"
    }

@router.post("/request/cancel")
async def cancel_chat_request(request_data: dict):
    """Cancel a chat request by user"""
    user_id = request_data.get("user_id")
    request_id = request_data.get("request_id")
    
    if not user_id or not request_id:
        raise HTTPException(status_code=400, detail="user_id and request_id are required")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if request exists and belongs to user
    cursor.execute("""
        SELECT id, status FROM chat_requests 
        WHERE id = ? AND user_id = ?
    """, (request_id, user_id))
    
    request = cursor.fetchone()
    if not request:
        conn.close()
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request['status'] != 'pending':
        conn.close()
        raise HTTPException(status_code=400, detail="Request cannot be canceled")
    
    # Update request status to canceled
    cursor.execute("""
        UPDATE chat_requests 
        SET status = 'canceled', 
            rejected_at = CURRENT_TIMESTAMP,
            rejection_reason = 'Canceled by user'
        WHERE id = ?
    """, (request_id,))
    
    conn.commit()
    conn.close()
    
    # Notify admin about cancellation
    cancellation_message = {
        "type": "request_canceled",
        "data": {
            "request_id": request_id,
            "user_id": user_id,
            "message": "Chat request has been canceled by user"
        }
    }
    
    await manager.broadcast_to_support(json.dumps(cancellation_message))
    
    return {
        "success": True,
        "message": "Request canceled successfully"
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
            "message": "We're currently experiencing high demand and all our support agents are busy. Don't worry! You can create a support ticket and we'll get back to you as soon as possible, or try again in a few minutes."
        }
    }))
    
    return {
        "success": True,
        "message": "Chat request rejected"
    }

@router.post("/sessions/{session_id}/end")
async def end_chat_session(session_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """End a chat session"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if session exists and is active
    cursor.execute("""
        SELECT * FROM chat_sessions 
        WHERE id = ? AND status = 'active'
    """, (session_id,))
    
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Active chat session not found")
    
    # Update session status to ended
    cursor.execute("""
        UPDATE chat_sessions 
        SET status = 'ended', ended_at = datetime('now', 'localtime'), ended_at_local = datetime('now', 'localtime')
        WHERE id = ?
    """, (session_id,))
    
    conn.commit()
    conn.close()
    
    # Notify all connected users about session end
    try:
        await manager.broadcast_to_session(session_id, json.dumps({
            "type": "session_ended",
            "session_id": session_id,
            "message": "Chat session has been ended"
        }))
    except Exception as e:
        pass
    
    return {"message": "Chat session ended successfully"}

@router.get("/sessions")
async def get_chat_sessions(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get active chat sessions for support user"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cs.id, cs.request_id, cs.user_id, cs.support_user_id, cs.status,
               COALESCE(cs.started_at_local, datetime(cs.started_at, 'localtime')) as started_at,
               COALESCE(cs.ended_at_local, datetime(cs.ended_at, 'localtime')) as ended_at,
               cr.user_name, cr.user_email, cc.name as category_name
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

@router.get("/sessions/total")
async def get_total_sessions(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get total number of chat sessions"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as total FROM chat_sessions")
    total = cursor.fetchone()[0]
    conn.close()
    
    return {"total_sessions": total}

@router.get("/sessions/all")
async def get_all_sessions(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all chat sessions (active and ended)"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current user's name for dynamic support name
    current_user_name = user.get("full_name") or user.get("username") or "Support Agent"
    
    cursor.execute("""
        SELECT cs.id, cs.request_id, cs.user_id, cs.support_user_id, cs.status, 
               COALESCE(cs.started_at_local, datetime(cs.started_at, 'localtime')) as started_at,
               COALESCE(cs.ended_at_local, datetime(cs.ended_at, 'localtime')) as ended_at,
               cr.user_name, cr.user_email, cc.name as category_name, cs_sub.name as subcategory_name
        FROM chat_sessions cs
        JOIN chat_requests cr ON cs.request_id = cr.id
        JOIN chat_categories cc ON cr.category_id = cc.id
        LEFT JOIN chat_subcategories cs_sub ON cr.subcategory_id = cs_sub.id
        ORDER BY cs.started_at DESC
    """)
    
    sessions = []
    for row in cursor.fetchall():
        # Get support name from user_management.db
        support_name = current_user_name  # Default to current user
        
        # Try to get support name from user_management.db
        try:
            from user_management_db import user_db
            support_user = user_db.get_user_by_id(row[3])  # row[3] is support_user_id
            if support_user:
                support_name = support_user.get("full_name") or support_user.get("username") or current_user_name
        except:
            # If user_management.db fails, use current user name
            support_name = current_user_name
        
        sessions.append({
            "id": row[0],
            "request_id": row[1],
            "user_id": row[2],
            "user_name": row[7] or "Anonymous",
            "user_email": row[8],
            "category_name": row[9],
            "subcategory_name": row[10],
            "support_name": support_name,
            "status": row[4],
            "started_at": row[5],
            "ended_at": row[6]
        })
    
    conn.close()
    return {"sessions": sessions}

@router.get("/requests/rejected")
async def get_rejected_requests(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all rejected chat requests with full details"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cr.*, cc.name as category_name, cs.name as subcategory_name, u.username as rejected_by
        FROM chat_requests cr
        JOIN chat_categories cc ON cr.category_id = cc.id
        LEFT JOIN chat_subcategories cs ON cr.subcategory_id = cs.id
        LEFT JOIN users u ON cr.rejected_by = u.id
        WHERE cr.status = 'rejected'
        ORDER BY cr.created_at DESC
    """)
    
    rejected_requests = []
    for row in cursor.fetchall():
        rejected_requests.append({
            "id": row["id"],
            "user_name": row["user_name"] or "Anonymous",
            "user_email": row["user_email"],
            "category_name": row["category_name"],
            "subcategory_name": row["subcategory_name"],
            "message": row["message"],
            "rejected_by": row["rejected_by"] or "System",
            "rejection_reason": row["rejection_reason"],
            "created_at": row["created_at"],
            "rejected_at": row["rejected_at"]
        })
    
    conn.close()
    return {"rejected_requests": rejected_requests}

@router.get("/sessions/{session_id}/messages/public")
async def get_chat_messages_public(session_id: int):
    """Get messages for a chat session (public endpoint for users)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get messages for this session in JSON format
    cursor.execute("""
        SELECT messages_json, message_count, last_message, last_sender, created_at, updated_at
        FROM chat_messages 
        WHERE session_id = ?
    """, (session_id,))
    
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        return {"messages": []}
    
    # Parse JSON messages
    messages_data = json.loads(result[0])
    
    # Convert to expected format
    messages = []
    for i, msg in enumerate(messages_data):
        messages.append({
            "id": i + 1,
            "session_id": session_id,
            "sender_type": msg["sender_type"],
            "sender_id": msg["sender_id"],
            "message": msg["message"],
            "message_type": msg.get("message_type", "text"),
            "is_read": False,  # Default for JSON format
            "created_at": msg["created_at"]
        })
    
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
    
    # Get messages in JSON format
    cursor.execute("""
        SELECT messages_json, message_count, last_message, last_sender, created_at, updated_at
        FROM chat_messages 
        WHERE session_id = ?
    """, (session_id,))
    
    result = cursor.fetchone()
    
    if not result:
        messages = []
    else:
        # Parse JSON messages
        messages_data = json.loads(result[0])
        
        # Convert to expected format
        messages = []
        for i, msg in enumerate(messages_data):
            messages.append({
                "id": i + 1,
                "sender_type": msg["sender_type"],
                "sender_id": msg["sender_id"],
                "message": msg["message"],
                "message_type": msg.get("message_type", "text"),
                "is_read": False,  # Default for JSON format
                "created_at": msg["created_at"]
            })
    
    conn.close()
    return {"messages": messages}

# Admin endpoints
@router.get("/admin/notifications")
async def get_admin_notifications(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get admin notifications"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, message, type, related_id, is_read, created_at
        FROM notifications 
        ORDER BY created_at DESC 
        LIMIT 50
    """)
    
    notifications = []
    for row in cursor.fetchall():
        notifications.append({
            "id": row[0],
            "title": row[1],
            "message": row[2],
            "type": row[3],
            "related_id": row[4],
            "is_read": bool(row[5]),
            "created_at": row[6]
        })
    
    conn.close()
    return {"notifications": notifications}

@router.get("/admin/notifications/count")
async def get_admin_notifications_count(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get unread notifications count"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
    count = cursor.fetchone()[0]
    
    conn.close()
    return {"unread_count": count}

@router.get("/admin/tickets")
async def get_admin_tickets(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get admin tickets"""
    # Verify token and get user
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, description, status, priority, created_at, updated_at
        FROM tickets 
        ORDER BY created_at DESC 
        LIMIT 50
    """)
    
    tickets = []
    for row in cursor.fetchall():
        tickets.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "status": row[3],
            "priority": row[4],
            "created_at": row[5],
            "updated_at": row[6]
        })
    
    conn.close()
    return {"tickets": tickets}

# WebSocket endpoint for real-time chat
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id, "user")
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data["type"] == "chat_message":
                # Save message to database in JSON format
                save_message_to_json(
                    message_data["session_id"],
                    message_data["sender_type"],
                    message_data["sender_id"],
                    message_data["message"],
                    message_data.get("message_type", "text")
                )
                
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
                    # Forward message to other participant
                    if message_data["sender_type"] == "user":
                        # User sent message, forward to support
                        await manager.send_to_support(str(session[1]), data)
                    else:
                        # Support sent message, forward to user
                        await manager.send_to_user(session[0], data)
                else:
                    # Session not found - send error back to sender
                    error_message = {
                        "type": "error",
                        "message": "Chat session not found or expired"
                    }
                    await websocket.send_text(json.dumps(error_message))
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, "user")

@router.websocket("/ws/support/{support_user_id}")
async def support_websocket_endpoint(websocket: WebSocket, support_user_id: str):
    try:
        await manager.connect(websocket, support_user_id, "support")
    except Exception as e:
        await websocket.close()
        return
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data["type"] == "chat_message":
                # Save message to database in JSON format
                save_message_to_json(
                    message_data["session_id"],
                    message_data["sender_type"],
                    message_data["sender_id"],
                    message_data["message"],
                    message_data.get("message_type", "text")
                )
                
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

# Feedback endpoints
@router.post("/feedback")
async def submit_feedback(feedback: FeedbackCreate):
    """Submit chat feedback"""
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate session exists and is ended
        cursor.execute("""
            SELECT id, status FROM chat_sessions 
            WHERE id = ? AND user_id = ?
        """, (feedback.session_id, feedback.user_id))
        
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        if session[1] != 'ended':
            raise HTTPException(status_code=400, detail="Can only submit feedback for ended sessions")
        
        # Insert feedback
        cursor.execute("""
            INSERT INTO chat_feedback (
                session_id, user_id, admin_user_id, overall_rating, 
                support_quality, response_time, comments, would_recommend
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            feedback.session_id,
            feedback.user_id,
            feedback.admin_user_id,
            feedback.overall_rating,
            feedback.support_quality,
            feedback.response_time,
            feedback.comments,
            feedback.would_recommend
        ))
        
        conn.commit()
        feedback_id = cursor.lastrowid
        
        return {"message": "Feedback submitted successfully", "feedback_id": feedback_id}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
    finally:
        conn.close()

@router.get("/feedback/stats")
async def get_feedback_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get feedback statistics for admin dashboard"""
    
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get overall stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_feedback,
                AVG(overall_rating) as avg_overall,
                AVG(support_quality) as avg_support,
                AVG(response_time) as avg_response,
                SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as recommend_count
            FROM chat_feedback
        """)
        
        stats = cursor.fetchone()
        
        # Get recent feedback
        cursor.execute("""
            SELECT 
                cf.*,
                cr.user_name,
                cr.user_email,
                u.username as admin_name
            FROM chat_feedback cf
            LEFT JOIN chat_sessions cs ON cf.session_id = cs.id
            LEFT JOIN chat_requests cr ON cs.request_id = cr.id
            LEFT JOIN users u ON cf.admin_user_id = u.id
            ORDER BY cf.created_at DESC
            LIMIT 10
        """)
        
        recent_feedback = cursor.fetchall()
        
        # Get rating distribution
        cursor.execute("""
            SELECT 
                overall_rating,
                COUNT(*) as count
            FROM chat_feedback
            GROUP BY overall_rating
            ORDER BY overall_rating
        """)
        
        rating_distribution = cursor.fetchall()
        
        return {
            "total_feedback": stats[0] or 0,
            "average_ratings": {
                "overall": round(stats[1] or 0, 2),
                "support_quality": round(stats[2] or 0, 2),
                "response_time": round(stats[3] or 0, 2)
            },
            "recommendation_rate": round((stats[4] or 0) / max(stats[0] or 1, 1) * 100, 2),
            "recent_feedback": [
                {
                    "id": row[0],
                    "session_id": row[1],
                    "user_name": row[10] if row[10] else "Unknown",
                    "user_email": row[11] if row[11] else "Unknown",
                    "admin_name": row[12] if row[12] else "Unknown",
                    "overall_rating": row[4],
                    "support_quality": row[5],
                    "response_time": row[6],
                    "comments": row[7],
                    "would_recommend": bool(row[8]),
                    "created_at": row[9]
                }
                for row in recent_feedback
            ],
            "rating_distribution": [
                {"rating": row[0], "count": row[1]}
                for row in rating_distribution
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch feedback statistics")
    finally:
        conn.close()
