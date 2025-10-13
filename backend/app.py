from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from router_chat import router as chat_router
from admin_dashboard import router as admin_router
from simple_auth_router import router as auth_router

app = FastAPI(title="Venturing Digitally Chatbot", version="2.0.0")

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)

@app.get("/health")
def health():
    return {"status": "ok", "message": "Venturing Digitally Chatbot API is running"}