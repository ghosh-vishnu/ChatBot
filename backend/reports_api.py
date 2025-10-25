#!/usr/bin/env python3
"""
Reports API for downloading chat conversations and analytics data
"""

import sqlite3
import json
import csv
import io
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter()

def get_chat_conversations():
    """Get all chat conversations from database"""
    try:
        conn = sqlite3.connect('venturing.db')
        cursor = conn.cursor()
        
        # Get chat sessions with messages
        cursor.execute("""
            SELECT 
                cs.id as session_id,
                cs.user_id,
                cs.support_user_id,
                cs.status,
                cs.started_at,
                cs.ended_at,
                cm.messages_json,
                cm.message_count,
                cm.last_message,
                cm.last_sender,
                u.full_name as support_name
            FROM chat_sessions cs
            LEFT JOIN chat_messages cm ON cs.id = cm.session_id
            LEFT JOIN users u ON cs.support_user_id = u.id
            ORDER BY cs.started_at DESC
        """)
        
        sessions = cursor.fetchall()
        conn.close()
        
        return sessions
    except Exception as e:
        print(f"Error getting chat conversations: {e}")
        return []

def get_conversations_count():
    """Get total conversations count"""
    try:
        conn = sqlite3.connect('venturing.db')
        cursor = conn.cursor()
        
        # Get total conversations
        cursor.execute("SELECT COUNT(*) FROM chat_sessions")
        total_conversations = cursor.fetchone()[0] or 0
        
        # Get today's conversations
        cursor.execute("""
            SELECT COUNT(*) FROM chat_sessions 
            WHERE date(started_at) = date('now')
        """)
        today_conversations = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return {
            "total": total_conversations,
            "today": today_conversations
        }
    except Exception as e:
        print(f"Error getting conversations count: {e}")
        return {"total": 0, "today": 0}

@router.get("/reports/conversations/count")
async def get_conversations_count_api():
    """Get conversations count for reports"""
    return get_conversations_count()

@router.get("/reports/conversations/download")
async def download_conversations():
    """Download chat conversations as Excel CSV"""
    try:
        conversations = get_chat_conversations()
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Session ID', 'User ID', 'Support User', 'Status', 
            'Started At', 'Ended At', 'Message Count', 
            'Last Message', 'Last Sender', 'All Messages'
        ])
        
        # Write data
        for session in conversations:
            session_id, user_id, support_user_id, status, started_at, ended_at, messages_json, message_count, last_message, last_sender, support_name = session
            
            # Parse messages JSON
            all_messages = ""
            if messages_json:
                try:
                    messages = json.loads(messages_json)
                    all_messages = " | ".join([f"{msg.get('sender', 'Unknown')}: {msg.get('message', '')}" for msg in messages])
                except:
                    all_messages = messages_json
            
            writer.writerow([
                session_id,
                user_id or 'N/A',
                support_name or 'N/A',
                status or 'N/A',
                started_at or 'N/A',
                ended_at or 'N/A',
                message_count or 0,
                last_message or 'N/A',
                last_sender or 'N/A',
                all_messages
            ])
        
        # Prepare response
        output.seek(0)
        content = output.getvalue()
        output.close()
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"chat_conversations_{timestamp}.csv"
        
        return StreamingResponse(
            io.BytesIO(content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        print(f"Error downloading conversations: {e}")
        raise HTTPException(status_code=500, detail="Error downloading conversations")

@router.get("/reports/analytics/download")
async def download_analytics():
    """Download analytics data as Excel CSV"""
    try:
        conn = sqlite3.connect('venturing.db')
        cursor = conn.cursor()
        
        # Get analytics data
        cursor.execute("SELECT COUNT(*) FROM chat_sessions")
        total_sessions = cursor.fetchone()[0] or 0
        
        cursor.execute("""
            SELECT COUNT(*) FROM chat_sessions 
            WHERE date(started_at) = date('now')
        """)
        today_sessions = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM chat_messages")
        total_messages = cursor.fetchone()[0] or 0
        
        cursor.execute("""
            SELECT COUNT(*) FROM chat_messages 
            WHERE date(created_at) = date('now')
        """)
        today_messages = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM faqs")
        total_faqs = cursor.fetchone()[0] or 0
        
        conn.close()
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Metric', 'Total', 'Today', 'Date'])
        
        # Write data
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        writer.writerow(['Total Sessions', total_sessions, today_sessions, current_date])
        writer.writerow(['Total Messages', total_messages, today_messages, current_date])
        writer.writerow(['Total FAQs', total_faqs, 0, current_date])
        
        # Prepare response
        output.seek(0)
        content = output.getvalue()
        output.close()
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"analytics_report_{timestamp}.csv"
        
        return StreamingResponse(
            io.BytesIO(content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        print(f"Error downloading analytics: {e}")
        raise HTTPException(status_code=500, detail="Error downloading analytics")
