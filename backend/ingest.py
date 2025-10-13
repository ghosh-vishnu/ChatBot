from __future__ import annotations

import json
import os
from typing import List, Dict, Any

from db import upsert_chunks
from embedding import embed_texts

def ingest_jsonl(file_path: str) -> int:
    """Ingest data from JSONL file"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    chunks = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                chunk = json.loads(line)
                chunks.append(chunk)
    
    if chunks:
        upsert_chunks(chunks)
        print(f"Ingested {len(chunks)} chunks from {file_path}")
    
    return len(chunks)

def ingest_json(file_path: str) -> int:
    """Ingest data from JSON file"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if isinstance(data, list):
        chunks = data
    else:
        chunks = [data]
    
    if chunks:
        upsert_chunks(chunks)
        print(f"Ingested {len(chunks)} chunks from {file_path}")
    
    return len(chunks)

if __name__ == "__main__":
    # Example usage
    data_dir = "data"
    chunks_file = os.path.join(data_dir, "chunks.jsonl")
    
    if os.path.exists(chunks_file):
        count = ingest_jsonl(chunks_file)
        print(f"Total chunks ingested: {count}")
    else:
        print(f"Chunks file not found: {chunks_file}")
