#!/usr/bin/env python3
"""
Real-time Analytics Stream using Server-Sent Events (SSE)
"""

import asyncio
import json
import random
import time
from datetime import datetime
from fastapi.responses import StreamingResponse

# Global analytics data
analytics_data = {
    "liveUsers": 0,
    "messagesToday": 0,
    "avgResponseTime": 0,
    "systemUptime": "99.9%",
    "errorRate": 0,
    "conversionRate": 0,
    "realTimeActivity": []
}

def generate_analytics_update():
    """Generate a random analytics update"""
    global analytics_data
    
    # Update live users (simulate real users)
    analytics_data["liveUsers"] = max(0, analytics_data["liveUsers"] + random.randint(-2, 3))
    
    # Update messages today
    analytics_data["messagesToday"] += random.randint(0, 5)
    
    # Update response time (fluctuate around 1000ms)
    base_time = 1000
    analytics_data["avgResponseTime"] = max(200, base_time + random.randint(-300, 500))
    
    # Update error rate (keep it low)
    analytics_data["errorRate"] = max(0, min(5, analytics_data["errorRate"] + random.uniform(-0.5, 0.3)))
    
    # Update conversion rate
    analytics_data["conversionRate"] = max(0, min(20, analytics_data["conversionRate"] + random.uniform(-1, 1)))
    
    # Add new activity
    activity_types = [
        "New user joined",
        "FAQ viewed", 
        "Message sent",
        "Error occurred",
        "System update",
        "User logged in",
        "Chat session started",
        "FAQ search performed"
    ]
    
    new_activity = {
        "id": f"activity_{int(time.time() * 1000)}",
        "type": random.choice(activity_types),
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "user": f"User {random.randint(1, 50)}",
        "details": "System activity detected"
    }
    
    analytics_data["realTimeActivity"].insert(0, new_activity)
    
    # Keep only last 10 activities
    analytics_data["realTimeActivity"] = analytics_data["realTimeActivity"][:10]
    
    return analytics_data.copy()

async def analytics_stream():
    """Stream analytics data using Server-Sent Events"""
    while True:
        try:
            # Generate new analytics data
            data = generate_analytics_update()
            
            # Format as SSE
            yield f"data: {json.dumps(data)}\n\n"
            
            # Wait before next update (1-3 seconds)
            await asyncio.sleep(random.uniform(1, 3))
            
        except Exception as e:
            print(f"Error in analytics stream: {e}")
            await asyncio.sleep(5)

def get_current_analytics():
    """Get current analytics data"""
    return analytics_data
