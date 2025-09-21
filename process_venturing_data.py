from __future__ import annotations

import json
import os
from typing import List, Dict, Any, Tuple
from scraper.chunk_utils import chunk_text
from scraper.config import MAX_TOKENS_PER_CHUNK, MIN_TOKENS_PER_CHUNK
from backend.db import upsert_chunks

# Configuration
INPUT_FILE = "data/venturing_digitally_data.json"
OUTPUT_CHUNKS_FILE = "data/chunks.jsonl"
OUTPUT_DOCS_FILE = "data/docs.jsonl"
OUTPUT_PAGES_FILE = "data/pages.jsonl"
DATA_DIR = "data"

def read_json(path: str) -> List[Dict[str, Any]]:
    """Read a JSON file"""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_jsonl(path: str, data: List[Dict[str, Any]]):
    """Write data to a JSONL file"""
    with open(path, "w", encoding="utf-8") as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

def process_scraped_data(input_path: str) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """Process scraped data into chunks and documents"""
    print("🔄 Processing Venturing Digitally data...")
    pages = read_json(input_path)
    print(f"📊 Loaded {len(pages)} pages")

    all_chunks: List[Dict] = []
    all_docs: List[Dict] = []
    
    # For tracking categories
    category_counts: Dict[str, int] = {}

    for page in pages:
        url = page.get("url", "")
        content = page.get("content", "")
        title = page.get("title", "")
        description = page.get("description", "")
        category = page.get("category", "general")

        # Combine title, description, and content for chunking
        full_text = f"{title}. {description}. {content}"
        
        if not full_text.strip():
            continue

        # Generate chunks
        chunks = chunk_text(
            text=full_text,
            source_url=url,
            max_tokens=MAX_TOKENS_PER_CHUNK,
            min_tokens=MIN_TOKENS_PER_CHUNK,
        )
        
        for chunk in chunks:
            chunk['category'] = category # Add category to chunk metadata
            all_chunks.append(chunk)
            all_docs.append({
                "id": chunk["id"],
                "text": chunk["text"],
                "url": chunk["url"],
                "category": chunk["category"] # Include category in docs
            })
            category_counts[category] = category_counts.get(category, 0) + 1

    print(f"📝 Created {len(all_chunks)} chunks from {len(pages)} pages")

    # Save processed data
    os.makedirs(DATA_DIR, exist_ok=True)
    write_jsonl(OUTPUT_CHUNKS_FILE, all_chunks)
    write_jsonl(OUTPUT_DOCS_FILE, all_docs)
    write_jsonl(OUTPUT_PAGES_FILE, pages) # Save original pages too

    print(f"💾 Saved data to:\n  - {OUTPUT_CHUNKS_FILE}\n  - {OUTPUT_DOCS_FILE}\n  - {OUTPUT_PAGES_FILE}")
    print("\n📁 Chunks by Category:")
    for cat, count in category_counts.items():
        print(f"  {cat}: {count} chunks")

    return all_chunks, all_docs, pages

if __name__ == "__main__":
    chunks, docs, pages = process_scraped_data(INPUT_FILE)
    # Optionally ingest into the vector store immediately
    if chunks:
        upsert_chunks(chunks)
        print("\n✅ Chunks ingested into vector store.")
    print("\n✅ Data processing completed successfully!")
