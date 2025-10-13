from __future__ import annotations

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import json
import os
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

router = APIRouter()

# Dynamic data storage with real-time updates
conversations_db = []
faqs_db = []
users_db = []
ai_models_db = []
system_metrics = {
    "start_time": datetime.now(),
    "total_requests": 0,
    "active_sessions": set(),
    "error_count": 0,
    "response_times": []
}

# Real-time data generation
def generate_dynamic_data():
    """Generate dynamic data based on current time and activity"""
    global conversations_db, faqs_db, users_db, ai_models_db
    
    # Dynamic conversations based on time
    current_hour = datetime.now().hour
    activity_multiplier = 1.0
    
    # Peak hours (9-17) have more activity
    if 9 <= current_hour <= 17:
        activity_multiplier = 2.0
    elif 18 <= current_hour <= 22:
        activity_multiplier = 1.5
    else:
        activity_multiplier = 0.5
    
    # Generate conversations dynamically
    conversations_to_generate = max(1, int(activity_multiplier * 5))
    
    sample_queries = [
        "What services do you offer?", "How can I get started?", "What are your pricing plans?",
        "Do you provide training?", "How do I contact support?", "What is your refund policy?",
        "Can I customize the chatbot?", "Do you offer API access?", "What integrations are available?",
        "How secure is your platform?", "What is your uptime guarantee?", "Do you offer 24/7 support?",
        "Can I integrate with my CRM?", "What languages do you support?", "How do I track performance?"
    ]
    
    sample_responses = [
        "We offer comprehensive AI chatbot solutions including custom development, integration services, and ongoing support.",
        "Getting started is easy! Simply sign up for an account and follow our onboarding guide.",
        "Our pricing plans start from $29/month for basic features and scale up based on your needs.",
        "Yes, we provide comprehensive training sessions for your team to maximize chatbot effectiveness.",
        "You can reach our support team via email, phone, or live chat. We're available 24/7.",
        "We offer a 30-day money-back guarantee if you're not satisfied with our services.",
        "Absolutely! Our chatbots are highly customizable to match your brand and requirements.",
        "Yes, we provide full API access for advanced integrations and custom implementations.",
        "We integrate with popular platforms like Slack, Microsoft Teams, Salesforce, and many more.",
        "Security is our top priority. We use enterprise-grade encryption and comply with all major security standards.",
        "We guarantee 99.9% uptime with our enterprise-grade infrastructure and monitoring.",
        "Yes, our support team is available 24/7 via multiple channels including live chat, email, and phone.",
        "Yes, we offer seamless CRM integrations with Salesforce, HubSpot, Pipedrive, and many others.",
        "We support over 50 languages with automatic detection and translation capabilities.",
        "You can track performance through our comprehensive analytics dashboard with real-time metrics."
    ]
    
    # Add new conversations dynamically
    for _ in range(conversations_to_generate):
        if len(conversations_db) < 100:  # Limit to prevent memory issues
            query = random.choice(sample_queries)
            response = random.choice(sample_responses)
            conversations_db.append({
                "id": f"conv_{len(conversations_db) + 1}_{int(datetime.now().timestamp())}",
                "user_query": query,
                "ai_response": response,
                "timestamp": datetime.now().isoformat(),
                "satisfaction_score": random.randint(3, 5),  # Generally positive
                "response_time": random.randint(200, 1500)
            })
    
    # Dynamic FAQs (initialize once, then update views/success rates)
    if not faqs_db:
        faq_categories = ["General", "Pricing", "Technical", "Support", "Integration"]
        for i in range(15):
            faqs_db.append({
                "id": f"faq_{i+1}",
                "question": f"FAQ {i+1}: {random.choice(sample_queries)}",
                "answer": f"Answer: {random.choice(sample_responses)}",
                "category": random.choice(faq_categories),
                "views": random.randint(10, 500),
                "success_rate": random.randint(75, 95),
                "last_updated": datetime.now().isoformat()
            })
    else:
        # Update FAQ metrics dynamically
        for faq in faqs_db:
            if random.random() < 0.1:  # 10% chance to update each FAQ
                faq["views"] += random.randint(1, 5)
                faq["success_rate"] = min(98, faq["success_rate"] + random.randint(-2, 3))
                faq["last_updated"] = datetime.now().isoformat()
    
    # Dynamic AI Models
    if not ai_models_db:
        model_names = ["GPT-4", "Claude-3", "Gemini-Pro", "Llama-2", "Custom-Model"]
        for i, model_name in enumerate(model_names):
            ai_models_db.append({
                "id": f"model_{i+1}",
                "model_name": model_name,
                "version": f"v{random.randint(1, 3)}.{random.randint(0, 9)}",
                "performance_score": random.randint(85, 98),
                "accuracy_rate": random.randint(88, 96),
                "response_time": random.randint(300, 1500),
                "training_data_size": random.randint(1000, 10000),
                "last_trained": datetime.now().isoformat(),
                "status": random.choice(["active", "training", "maintenance"])
            })
    else:
        # Update AI model metrics
        for model in ai_models_db:
            if random.random() < 0.05:  # 5% chance to update each model
                model["performance_score"] = min(98, model["performance_score"] + random.randint(-1, 2))
                model["accuracy_rate"] = min(96, model["accuracy_rate"] + random.randint(-1, 1))
                model["response_time"] = max(200, model["response_time"] + random.randint(-50, 50))

# Reset all data to initial state
def reset_all_data():
    """Reset all data to initial state for testing"""
    global conversations_db, faqs_db, users_db, ai_models_db, system_metrics
    
    # Clear all data
    conversations_db.clear()
    faqs_db.clear()
    users_db.clear()
    ai_models_db.clear()
    
    # Reset system metrics
    system_metrics = {
        "start_time": datetime.now(),
        "total_requests": 0,
        "active_sessions": set(),
        "error_count": 0,
        "response_times": []
    }
    
    # DON'T generate fresh data - keep everything empty for true reset
    # generate_dynamic_data()  # Commented out for true zero state
    
    return {
        "message": "All data reset successfully - Starting from zero",
        "timestamp": datetime.now().isoformat(),
        "conversations_count": len(conversations_db),
        "faqs_count": len(faqs_db),
        "ai_models_count": len(ai_models_db)
    }

# Initialize dynamic data
generate_dynamic_data()

# API Endpoints for Admin Dashboard

@router.get("/admin/stats")
async def get_dashboard_stats():
    """Get dynamic dashboard statistics"""
    try:
        # Only generate fresh data if we have existing data (not after reset)
        if conversations_db:
            generate_dynamic_data()
        
        # Update system metrics
        system_metrics["total_requests"] += 1
        current_response_time = random.randint(45, 120)
        system_metrics["response_times"].append(current_response_time)
        
        # Keep only last 100 response times for average calculation
        if len(system_metrics["response_times"]) > 100:
            system_metrics["response_times"] = system_metrics["response_times"][-100:]
        
        # Calculate dynamic metrics
        total_sessions = len(conversations_db)
        total_conversations = len(set([conv["id"] for conv in conversations_db]))
        total_messages = len(conversations_db) * 2  # user + AI messages
        
        # Dynamic response time calculation
        avg_response_time = sum(system_metrics["response_times"]) / len(system_metrics["response_times"]) if system_metrics["response_times"] else 0
        
        # Dynamic satisfaction based on time and activity
        current_hour = datetime.now().hour
        base_satisfaction = 85.0
        if 9 <= current_hour <= 17:  # Business hours
            satisfaction_modifier = 5.0
        elif 18 <= current_hour <= 22:  # Evening
            satisfaction_modifier = 2.0
        else:  # Night/early morning
            satisfaction_modifier = -2.0
        
        user_satisfaction = base_satisfaction + satisfaction_modifier + random.uniform(-3, 3)
        user_satisfaction = max(70, min(98, user_satisfaction))  # Clamp between 70-98
        
        # Dynamic active users based on time
        base_users = 50
        if 9 <= current_hour <= 17:
            active_users = base_users + random.randint(20, 80)
        elif 18 <= current_hour <= 22:
            active_users = base_users + random.randint(10, 40)
        else:
            active_users = base_users + random.randint(0, 20)
        
        # Conversations today (dynamic)
        today_conversations = len([conv for conv in conversations_db 
                                 if datetime.fromisoformat(conv["timestamp"]).date() == datetime.now().date()])
        
        # Dynamic server status
        error_rate = system_metrics["error_count"] / max(1, system_metrics["total_requests"])
        server_status = "healthy" if error_rate < 0.05 else "degraded" if error_rate < 0.1 else "unhealthy"
        
        # Dynamic uptime calculation
        uptime_hours = (datetime.now() - system_metrics["start_time"]).total_seconds() / 3600
        uptime_percentage = max(95.0, 99.9 - (error_rate * 100))
        
        return {
            "total_sessions": total_sessions,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "avg_response_time": round(avg_response_time, 2),
            "user_satisfaction": round(user_satisfaction, 1),
            "active_users": active_users,
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
    """Get dynamic recent conversations"""
    try:
        # Only generate fresh data if we have existing data (not after reset)
        if conversations_db:
            generate_dynamic_data()
        
        # Sort by timestamp (most recent first)
        sorted_conversations = sorted(conversations_db, key=lambda x: x["timestamp"], reverse=True)
        
        # Add some randomness to simulate real-time updates (only if data exists)
        if conversations_db and random.random() < 0.3:  # 30% chance to add a new conversation
            sample_queries = [
                "What services do you offer?", "How can I get started?", "What are your pricing plans?",
                "Do you provide training?", "How do I contact support?", "What is your refund policy?"
            ]
            sample_responses = [
                "We offer comprehensive AI chatbot solutions including custom development, integration services, and ongoing support.",
                "Getting started is easy! Simply sign up for an account and follow our onboarding guide.",
                "Our pricing plans start from $29/month for basic features and scale up based on your needs."
            ]
            
            new_conversation = {
                "id": f"conv_{len(conversations_db) + 1}_{int(datetime.now().timestamp())}",
                "user_query": random.choice(sample_queries),
                "ai_response": random.choice(sample_responses),
                "timestamp": datetime.now().isoformat(),
                "satisfaction_score": random.randint(3, 5),
                "response_time": random.randint(200, 1500)
            }
            conversations_db.insert(0, new_conversation)
            sorted_conversations.insert(0, new_conversation)
        
        return {
            "conversations": sorted_conversations[:limit],
            "total": len(conversations_db),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/faqs")
async def get_faqs():
    """Get dynamic FAQs"""
    try:
        # Generate fresh dynamic data
        generate_dynamic_data()
        
        return {
            "faqs": faqs_db,
            "total": len(faqs_db),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/user-analytics")
async def get_user_analytics():
    """Get dynamic user analytics data"""
    try:
        # Generate fresh dynamic data
        generate_dynamic_data()
        
        # Dynamic user analytics based on time
        current_hour = datetime.now().hour
        current_day = datetime.now().weekday()  # 0 = Monday, 6 = Sunday
        
        # Base user counts
        base_total_users = 2500
        base_active_users = 300
        
        # Time-based modifiers
        if 9 <= current_hour <= 17:  # Business hours
            time_modifier = 1.5
        elif 18 <= current_hour <= 22:  # Evening
            time_modifier = 1.2
        else:  # Night/early morning
            time_modifier = 0.7
        
        # Day-based modifiers (weekdays vs weekends)
        if current_day < 5:  # Weekdays
            day_modifier = 1.3
        else:  # Weekends
            day_modifier = 0.8
        
        total_modifier = time_modifier * day_modifier
        
        # Dynamic geographic distribution
        countries = ["USA", "India", "UK", "Canada", "Australia", "Germany", "France", "Japan", "Brazil", "Mexico"]
        geographic_distribution = []
        for country in countries:
            base_count = random.randint(50, 500)
            # Some countries have different activity patterns
            if country in ["USA", "India", "UK"]:
                count = int(base_count * total_modifier * 1.2)
            else:
                count = int(base_count * total_modifier)
            geographic_distribution.append({"country": country, "count": count})
        
        # Dynamic device analytics
        devices = ["Desktop", "Mobile", "Tablet"]
        device_analytics = []
        for device in devices:
            if device == "Mobile":
                base_count = random.randint(400, 800)
            elif device == "Desktop":
                base_count = random.randint(300, 600)
            else:  # Tablet
                base_count = random.randint(50, 200)
            
            count = int(base_count * total_modifier)
            device_analytics.append({"device": device, "count": count})
        
        # Dynamic browser analytics
        browsers = ["Chrome", "Safari", "Firefox", "Edge", "Opera"]
        browser_analytics = []
        for browser in browsers:
            if browser == "Chrome":
                base_count = random.randint(300, 600)
            elif browser == "Safari":
                base_count = random.randint(200, 400)
            else:
                base_count = random.randint(50, 200)
            
            count = int(base_count * total_modifier)
            browser_analytics.append({"browser": browser, "count": count})
        
        # Dynamic session duration (longer during business hours)
        if 9 <= current_hour <= 17:
            avg_session_duration = random.randint(600, 1200)  # 10-20 minutes
        else:
            avg_session_duration = random.randint(300, 600)  # 5-10 minutes
        
        # Dynamic satisfaction score
        base_satisfaction = 85.0
        if 9 <= current_hour <= 17:
            satisfaction_modifier = 5.0
        elif 18 <= current_hour <= 22:
            satisfaction_modifier = 2.0
        else:
            satisfaction_modifier = -2.0
        
        satisfaction_score = base_satisfaction + satisfaction_modifier + random.uniform(-3, 3)
        satisfaction_score = max(70, min(98, satisfaction_score))
        
        return {
            "total_users": int(base_total_users * total_modifier),
            "active_users": int(base_active_users * total_modifier),
            "new_users_today": random.randint(10, 50),
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
    """Get dynamic AI model information"""
    try:
        # Generate fresh dynamic data
        generate_dynamic_data()
        
        return {
            "models": ai_models_db,
            "total": len(ai_models_db),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/faqs")
async def create_faq(faq_data: dict):
    """Create a new FAQ"""
    try:
        new_faq = {
            "id": f"faq_{len(faqs_db) + 1}_{int(datetime.now().timestamp())}",
            "question": faq_data.get("question", ""),
            "answer": faq_data.get("answer", ""),
            "category": faq_data.get("category", "General"),
            "views": 0,
            "success_rate": 85,
            "last_updated": datetime.now().isoformat()
        }
        faqs_db.append(new_faq)
        return {"message": "FAQ created successfully", "faq": new_faq}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/faqs/{faq_id}")
async def update_faq(faq_id: str, faq_data: dict):
    """Update an existing FAQ"""
    try:
        for i, faq in enumerate(faqs_db):
            if faq["id"] == faq_id:
                faqs_db[i].update({
                    "question": faq_data.get("question", faq["question"]),
                    "answer": faq_data.get("answer", faq["answer"]),
                    "category": faq_data.get("category", faq["category"]),
                    "last_updated": datetime.now().isoformat()
                })
                return {"message": "FAQ updated successfully", "faq": faqs_db[i]}
        raise HTTPException(status_code=404, detail="FAQ not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/faqs/{faq_id}")
async def delete_faq(faq_id: str):
    """Delete an FAQ"""
    try:
        for i, faq in enumerate(faqs_db):
            if faq["id"] == faq_id:
                deleted_faq = faqs_db.pop(i)
                return {"message": "FAQ deleted successfully", "faq": deleted_faq}
        raise HTTPException(status_code=404, detail="FAQ not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/reset-data")
async def reset_data():
    """Reset all data to initial state"""
    try:
        result = reset_all_data()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))