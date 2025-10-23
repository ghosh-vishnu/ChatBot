from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from router_chat import router as chat_router
from admin_dashboard_db import router as admin_router
from auth_router import router as auth_router
from ticket_api import router as ticket_router
from user_management_api import router as user_management_router
from live_chat_api import router as live_chat_router
from sqlite_auth import db_auth
from analytics_stream import analytics_stream, get_current_analytics
from notification_stream import create_notification_routes

app = FastAPI(title="Venturing Digitally Chatbot", version="2.0.0")

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    db_auth.init_database()

# Include routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)
app.include_router(ticket_router)
app.include_router(user_management_router, prefix="/api/users", tags=["User Management"])
app.include_router(live_chat_router, tags=["Live Chat"])

# Add notification routes
create_notification_routes(app)

# Mount static files
app.mount("/static", StaticFiles(directory="../frontend/public"), name="static")

# Add analytics endpoints
@app.get("/analytics/stream")
async def stream_analytics():
    """SSE endpoint for real-time analytics"""
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        analytics_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@app.get("/analytics/current")
async def get_analytics():
    """Get current analytics data"""
    return get_current_analytics()

@app.get("/health")
def health():
    return {"status": "ok", "message": "Venturing Digitally Chatbot API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)