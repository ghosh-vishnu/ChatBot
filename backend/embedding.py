from __future__ import annotations

import os
from typing import List

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from fastembed import TextEmbedding
    FASTEMBED_AVAILABLE = True
except ImportError:
    FASTEMBED_AVAILABLE = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed texts using available embedding model"""
    if OPENAI_API_KEY and OPENAI_AVAILABLE:
        return _embed_with_openai(texts)
    elif FASTEMBED_AVAILABLE:
        return _embed_with_fastembed(texts)
    else:
        raise RuntimeError("No embedding model available")

def _embed_with_openai(texts: List[str]) -> List[List[float]]:
    """Embed texts using OpenAI"""
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=texts
    )
    return [data.embedding for data in response.data]

def _embed_with_fastembed(texts: List[str]) -> List[List[float]]:
    """Embed texts using FastEmbed"""
    model = TextEmbedding()
    embeddings = list(model.embed(texts))
    return embeddings
