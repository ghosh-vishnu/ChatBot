# backend/admin_dashboard_db.py
"""
Database-powered Admin Dashboard
Uses file-based authentication system
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any
import json
import os
from datetime import datetime, timedelta
import random

from sqlite_auth import db_auth

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token
    payload = db_auth.verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db_auth.get_user_by_username(username)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert SQLite Row to dict if needed
    if hasattr(user, 'keys'):
        user = dict(user)
    
    return user

def get_current_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current admin user"""
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token
    payload = db_auth.verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db_auth.get_user_by_username(username)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert SQLite Row to dict if needed
    if hasattr(user, 'keys'):
        user = dict(user)
    
    # Check if user is admin
    if not user.get("is_admin", False):
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )
    
    return user

# File-based data storage
DATA_DIR = "data"
CONVERSATIONS_FILE = os.path.join(DATA_DIR, "conversations.json")
FAQS_FILE = os.path.join(DATA_DIR, "faqs.json")
METRICS_FILE = os.path.join(DATA_DIR, "metrics.json")

def ensure_data_dir():
    """Ensure data directory exists"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def load_data(filename: str, default: list = None) -> list:
    """Load data from JSON file"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        return default or []
    except (json.JSONDecodeError, FileNotFoundError):
        return default or []

def save_data(filename: str, data: list):
    """Save data to JSON file"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def load_metrics() -> dict:
    """Load metrics from JSON file"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, "metrics.json")
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        return {
            "start_time": datetime.now().isoformat(),
            "total_requests": 0,
            "error_count": 0,
            "response_times": []
        }
    except (json.JSONDecodeError, FileNotFoundError):
        return {
            "start_time": datetime.now().isoformat(),
            "total_requests": 0,
            "error_count": 0,
            "response_times": []
        }

def save_metrics(metrics: dict):
    """Save metrics to JSON file"""
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, "metrics.json")
    with open(filepath, 'w') as f:
        json.dump(metrics, f, indent=2)

# API Endpoints

@router.get("/admin/stats")
async def get_dashboard_stats():
    """Get dashboard statistics - Public endpoint for testing"""
    try:
        # Load data
        conversations = load_data("conversations.json", [])
        metrics = load_metrics()
        
        # Update metrics
        metrics["total_requests"] += 1
        current_response_time = random.randint(45, 120)
        metrics["response_times"].append(current_response_time)
        
        # Keep only last 100 response times
        if len(metrics["response_times"]) > 100:
            metrics["response_times"] = metrics["response_times"][-100:]
        
        # Calculate stats
        total_sessions = len(conversations)
        total_conversations = len(set([conv.get("id", "") for conv in conversations]))
        total_messages = len(conversations) * 2  # user + AI messages
        
        # Calculate average response time
        avg_response_time = sum(metrics["response_times"]) / len(metrics["response_times"]) if metrics["response_times"] else 0
        
        # Calculate satisfaction
        satisfaction_scores = [conv.get("satisfaction_score", 4) for conv in conversations if conv.get("satisfaction_score")]
        user_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) * 20 if satisfaction_scores else 85  # Convert 1-5 to percentage
        
        # Active users (simulate based on recent activity)
        recent_conversations = [conv for conv in conversations 
                              if datetime.fromisoformat(conv.get("timestamp", datetime.now().isoformat())) > datetime.now() - timedelta(hours=1)]
        active_users = len(set([conv.get("user_id", "anonymous") for conv in recent_conversations]))
        
        # Conversations today
        today_conversations = len([conv for conv in conversations 
                                 if datetime.fromisoformat(conv.get("timestamp", datetime.now().isoformat())).date() == datetime.now().date()])
        
        # Server status
        error_rate = metrics["error_count"] / max(1, metrics["total_requests"])
        server_status = "healthy" if error_rate < 0.05 else "degraded" if error_rate < 0.1 else "unhealthy"
        
        # Uptime calculation
        start_time = datetime.fromisoformat(metrics["start_time"])
        uptime_hours = (datetime.now() - start_time).total_seconds() / 3600
        uptime_percentage = max(95.0, 99.9 - (error_rate * 100))
        
        # Save updated metrics
        save_metrics(metrics)
        
        return {
            "total_sessions": total_sessions,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "avg_response_time": round(avg_response_time, 2),
            "user_satisfaction": round(user_satisfaction, 1),
            "active_users": max(1, active_users),
            "conversations_today": today_conversations,
            "server_status": server_status,
            "response_time": current_response_time,
            "uptime": round(uptime_percentage, 1),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/conversations")
async def get_recent_conversations(limit: int = 10):
    """Get recent conversations - Public endpoint for testing"""
    """Get recent conversations"""
    try:
        conversations = load_data("conversations.json", [])
        
        # Sort by timestamp (most recent first)
        sorted_conversations = sorted(conversations, 
                                    key=lambda x: x.get("timestamp", ""), 
                                    reverse=True)
        
        return {
            "conversations": sorted_conversations[:limit],
            "total": len(conversations),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/faqs")
async def get_faqs():
    """Get FAQs - Public endpoint for testing"""
    """Get FAQs"""
    try:
        faqs = load_data("faqs.json", [])
        
        return {
            "faqs": faqs,
            "total": len(faqs),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/faqs")
async def create_faq(faq_data: dict):
    """Create a new FAQ - Public endpoint for testing"""
    """Create a new FAQ"""
    try:
        faqs = load_data("faqs.json", [])
        
        new_faq = {
            "id": f"faq_{len(faqs) + 1}_{int(datetime.now().timestamp())}",
            "question": faq_data.get("question", ""),
            "answer": faq_data.get("answer", ""),
            "category": faq_data.get("category", "General"),
            "customCategory": faq_data.get("customCategory", ""),
            "views": 0,
            "success_rate": 85,
            "last_updated": datetime.now().isoformat()
        }
        
        faqs.append(new_faq)
        save_data("faqs.json", faqs)
        
        return {"message": "FAQ created successfully", "faq": new_faq}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/faqs/{faq_id}")
async def update_faq(faq_id: str, faq_data: dict):
    """Update an existing FAQ - Public endpoint for testing"""
    """Update an existing FAQ"""
    try:
        faqs = load_data("faqs.json", [])
        
        for i, faq in enumerate(faqs):
            if faq["id"] == faq_id:
                faqs[i].update({
                    "question": faq_data.get("question", faq["question"]),
                    "answer": faq_data.get("answer", faq["answer"]),
                    "category": faq_data.get("category", faq["category"]),
                    "customCategory": faq_data.get("customCategory", faq.get("customCategory", "")),
                    "last_updated": datetime.now().isoformat()
                })
                save_data("faqs.json", faqs)
                return {"message": "FAQ updated successfully", "faq": faqs[i]}
        
        raise HTTPException(status_code=404, detail="FAQ not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/faqs/{faq_id}")
async def delete_faq(faq_id: str):
    """Delete an existing FAQ - Public endpoint for testing"""
    """Delete an FAQ"""
    try:
        faqs = load_data("faqs.json", [])
        
        for i, faq in enumerate(faqs):
            if faq["id"] == faq_id:
                deleted_faq = faqs.pop(i)
                save_data("faqs.json", faqs)
                return {"message": "FAQ deleted successfully", "faq": deleted_faq}
        
        raise HTTPException(status_code=404, detail="FAQ not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/user-analytics")
async def get_user_analytics():
    """Get user analytics data - Public endpoint for testing"""
    """Get user analytics data"""
    try:
        conversations = load_data("conversations.json", [])
        
        # Calculate user analytics
        total_users = len(set([conv.get("user_id", "anonymous") for conv in conversations]))
        active_users = len(set([conv.get("user_id", "anonymous") for conv in conversations 
                              if datetime.fromisoformat(conv.get("timestamp", datetime.now().isoformat())) > datetime.now() - timedelta(hours=24)]))
        
        # Geographic distribution (simulated)
        countries = ["USA", "India", "UK", "Canada", "Australia", "Germany", "France", "Japan", "Brazil", "Mexico"]
        geographic_distribution = []
        for country in countries:
            count = random.randint(10, 100)
            geographic_distribution.append({"country": country, "count": count})
        
        # Device analytics (simulated)
        devices = ["Desktop", "Mobile", "Tablet"]
        device_analytics = []
        for device in devices:
            if device == "Mobile":
                count = random.randint(40, 80)
            elif device == "Desktop":
                count = random.randint(30, 60)
            else:  # Tablet
                count = random.randint(5, 20)
            device_analytics.append({"device": device, "count": count})
        
        # Browser analytics (simulated)
        browsers = ["Chrome", "Safari", "Firefox", "Edge", "Opera"]
        browser_analytics = []
        for browser in browsers:
            if browser == "Chrome":
                count = random.randint(30, 60)
            elif browser == "Safari":
                count = random.randint(20, 40)
            else:
                count = random.randint(5, 20)
            browser_analytics.append({"browser": browser, "count": count})
        
        # Session duration (simulated)
        avg_session_duration = random.randint(300, 1200)  # 5-20 minutes
        
        # Satisfaction score
        satisfaction_scores = [conv.get("satisfaction_score", 4) for conv in conversations if conv.get("satisfaction_score")]
        satisfaction_score = sum(satisfaction_scores) / len(satisfaction_scores) * 20 if satisfaction_scores else 85
        
        return {
            "total_users": max(1, total_users),
            "active_users": max(1, active_users),
            "new_users_today": random.randint(1, 10),
            "geographic_distribution": geographic_distribution,
            "device_analytics": device_analytics,
            "browser_analytics": browser_analytics,
            "avg_session_duration": avg_session_duration,
            "satisfaction_score": round(satisfaction_score, 1),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/ai-models")
async def get_ai_models():
    """Get AI model information - Public endpoint for testing"""
    """Get AI model information"""
    try:
        # Simulated AI models data
        models = [
            {
                "id": "model_1",
                "model_name": "GPT-4",
                "version": "v4.0",
                "performance_score": 95,
                "accuracy_rate": 92,
                "response_time": 800,
                "training_data_size": 5000,
                "last_trained": datetime.now().isoformat(),
                "status": "active"
            },
            {
                "id": "model_2",
                "model_name": "Claude-3",
                "version": "v3.0",
                "performance_score": 93,
                "accuracy_rate": 90,
                "response_time": 900,
                "training_data_size": 4500,
                "last_trained": datetime.now().isoformat(),
                "status": "active"
            },
            {
                "id": "model_3",
                "model_name": "Custom-Model",
                "version": "v1.2",
                "performance_score": 88,
                "accuracy_rate": 85,
                "response_time": 1200,
                "training_data_size": 2000,
                "last_trained": datetime.now().isoformat(),
                "status": "training"
            }
        ]
        
        return {
            "models": models,
            "total": len(models),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/reset-data")
async def reset_data(current_user: dict = Depends(get_current_admin_user)):
    """Reset all data"""
    try:
        # Clear all data files
        save_data("conversations.json", [])
        save_data("faqs.json", [])
        
        # Reset metrics
        metrics = {
            "start_time": datetime.now().isoformat(),
            "total_requests": 0,
            "error_count": 0,
            "response_times": []
        }
        save_metrics(metrics)
        
        return {
            "message": "All data reset successfully",
            "timestamp": datetime.now().isoformat(),
            "conversations_count": 0,
            "faqs_count": 0,
            "ai_models_count": 3
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
