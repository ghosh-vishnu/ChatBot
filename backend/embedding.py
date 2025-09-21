from __future__ import annotations

from typing import List

from .config import OPENAI_API_KEY, EMBED_MODEL

try:
    from fastembed import TextEmbedding
    _LOCAL_EMBEDDING = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
except Exception:
    _LOCAL_EMBEDDING = None


def embed_texts(texts: List[str]) -> List[List[float]]:
    # Prefer OpenAI if key is present; else fallback to local fastembed
    if OPENAI_API_KEY:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
        return [d.embedding for d in resp.data]
    if _LOCAL_EMBEDDING is None:
        raise RuntimeError("Local embedding model not available. Install fastembed.")
    # fastembed returns generator of vectors
    vectors = list(_LOCAL_EMBEDDING.embed(texts))
    return [list(map(float, v)) for v in vectors]


