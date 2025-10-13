from __future__ import annotations

import json
import os
from typing import List, Dict, Any

import numpy as np

from config import DATA_DIR
from embedding import embed_texts


INDEX_PATH = os.path.join(DATA_DIR, "index.npy")
DOCS_PATH = os.path.join(DATA_DIR, "docs.jsonl")


def _load_index():
    if not (os.path.exists(INDEX_PATH) and os.path.exists(DOCS_PATH)):
        return None, []
    arr = np.load(INDEX_PATH)
    docs: List[Dict[str, Any]] = []
    with open(DOCS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                docs.append(json.loads(line))
    return arr, docs


def _save_index(embeddings: np.ndarray, docs: List[Dict[str, Any]]):
    os.makedirs(DATA_DIR, exist_ok=True)
    np.save(INDEX_PATH, embeddings)
    with open(DOCS_PATH, "w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")


def upsert_chunks(chunks: List[Dict[str, Any]]):
    if not chunks:
        return
    existing_emb, existing_docs = _load_index()
    texts = [c["text"] for c in chunks]
    embs = np.array(embed_texts(texts), dtype=np.float32)
    docs = [{"id": str(c["id"]), "text": c["text"], "url": c["url"]} for c in chunks]

    if existing_emb is None:
        new_emb = embs
        new_docs = docs
    else:
        new_emb = np.vstack([existing_emb, embs])
        new_docs = existing_docs + docs
    _save_index(new_emb, new_docs)


def query_similar(text: str, top_k: int = 4, min_similarity: float = 0.1):
    emb_matrix, docs = _load_index()
    if emb_matrix is None or len(docs) == 0:
        return []
    query_emb = np.array(embed_texts([text])[0], dtype=np.float32)
    # cosine similarity
    norms = np.linalg.norm(emb_matrix, axis=1) * np.linalg.norm(query_emb)
    sims = (emb_matrix @ query_emb) / np.clip(norms, 1e-8, None)
    idxs = np.argsort(-sims)[:top_k]
    results = []
    for idx in idxs:
        similarity = sims[idx]
        if similarity >= min_similarity:  # Only return results above threshold
            d = docs[int(idx)]
            results.append({
                "id": d["id"], 
                "text": d["text"], 
                "metadata": {"url": d.get("url", "")},
                "similarity": float(similarity)
            })
    return results


