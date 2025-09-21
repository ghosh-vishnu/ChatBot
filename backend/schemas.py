from __future__ import annotations

from typing import List, Dict, Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    suggestions: List[Dict[str, Any]] = []


