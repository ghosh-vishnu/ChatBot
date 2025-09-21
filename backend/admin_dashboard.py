from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import json
import os
from datetime import datetime

router = APIRouter()

# Simple HTML template for admin dashboard
ADMIN_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Chatbot Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .conversations { margin-top: 20px; }
        .conversation-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .query { font-weight: bold; color: #333; }
        .response { color: #666; margin-top: 5px; }
        .timestamp { font-size: 0.8em; color: #999; margin-top: 5px; }
        .refresh-btn { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
        .refresh-btn:hover { background: #218838; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Chatbot Admin Dashboard</h1>
            <p>Monitor your AI chatbot performance and conversations</p>
        </div>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">{{ total_sessions }}</div>
                <div class="stat-label">Active Sessions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ total_conversations }}</div>
                <div class="stat-label">Total Conversations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ today_conversations }}</div>
                <div class="stat-label">Today's Conversations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ avg_response_time }}ms</div>
                <div class="stat-label">Avg Response Time</div>
            </div>
        </div>
        
        <div class="conversations">
            <h2>Recent Conversations</h2>
            <!-- CONVERSATIONS_PLACEHOLDER -->
        </div>
    </div>
</body>
</html>
"""

@router.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request):
    """Admin dashboard for monitoring chatbot"""
    
    # Load conversation memory
    try:
        from .conversation_memory import conversation_memory
        
        # Get statistics
        total_sessions = len(conversation_memory.sessions)
        total_conversations = sum(len(session.get('conversation', [])) for session in conversation_memory.sessions.values())
        
        # Get today's conversations
        today = datetime.now().date()
        today_conversations = 0
        recent_conversations = []
        
        for session in conversation_memory.sessions.values():
            for conv in session.get('conversation', []):
                try:
                    conv_date = datetime.fromisoformat(conv['timestamp']).date()
                    if conv_date == today:
                        today_conversations += 1
                except:
                    pass
                
                # Get recent conversations (last 10)
                recent_conversations.append({
                    'query': conv['query'][:100] + '...' if len(conv['query']) > 100 else conv['query'],
                    'response': conv['response'][:150] + '...' if len(conv['response']) > 150 else conv['response'],
                    'timestamp': conv['timestamp'],
                    'intent': conv.get('intent', 'general')
                })
        
        # Sort by timestamp (most recent first)
        recent_conversations.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_conversations = recent_conversations[:10]  # Show last 10
        
        # Calculate average response time (mock data for now)
        avg_response_time = 150  # milliseconds
        
    except Exception as e:
        print(f"Error loading dashboard data: {e}")
        total_sessions = 0
        total_conversations = 0
        today_conversations = 0
        recent_conversations = []
        avg_response_time = 0
    
    # Create simple HTML
    conversations_html = ""
    for conv in recent_conversations:
        conversations_html += f"""
            <div class="conversation-item">
                <div class="query">❓ {conv['query']}</div>
                <div class="response">🤖 {conv['response']}</div>
                <div class="timestamp">⏰ {conv['timestamp']} | Intent: {conv['intent']}</div>
            </div>
        """
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Chatbot Admin Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; color: #333; margin-bottom: 30px; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }}
        .stat-card {{ background: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center; }}
        .stat-number {{ font-size: 2em; font-weight: bold; }}
        .stat-label {{ font-size: 0.9em; opacity: 0.9; }}
        .conversations {{ margin-top: 20px; }}
        .conversation-item {{ background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }}
        .query {{ font-weight: bold; color: #333; }}
        .response {{ color: #666; margin-top: 5px; }}
        .timestamp {{ font-size: 0.8em; color: #999; margin-top: 5px; }}
        .refresh-btn {{ background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }}
        .refresh-btn:hover {{ background: #218838; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Chatbot Admin Dashboard</h1>
            <p>Monitor your AI chatbot performance and conversations</p>
        </div>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">{total_sessions}</div>
                <div class="stat-label">Active Sessions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{total_conversations}</div>
                <div class="stat-label">Total Conversations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{today_conversations}</div>
                <div class="stat-label">Today's Conversations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{avg_response_time}ms</div>
                <div class="stat-label">Avg Response Time</div>
            </div>
        </div>
        
        <div class="conversations">
            <h2>Recent Conversations</h2>
            {conversations_html}
        </div>
    </div>
</body>
</html>
"""
    
    return HTMLResponse(content=html_content)

@router.get("/admin/api/stats")
async def get_stats():
    """API endpoint for dashboard statistics"""
    try:
        from .conversation_memory import conversation_memory
        
        stats = {
            "total_sessions": len(conversation_memory.sessions),
            "total_conversations": sum(len(session.get('conversation', [])) for session in conversation_memory.sessions.values()),
            "active_sessions": len([s for s in conversation_memory.sessions.values() 
                                  if datetime.now() - datetime.fromisoformat(s['last_activity']) < 
                                  conversation_memory.session_timeout]),
            "last_updated": datetime.now().isoformat()
        }
        
        return stats
        
    except Exception as e:
        return {"error": str(e)}

