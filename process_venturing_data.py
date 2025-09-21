#!/usr/bin/env python3
"""
Process Venturing Digitally scraped data and create chunks for the AI chatbot
"""

import json
import os
import re
from typing import List, Dict
import numpy as np

def clean_text(text: str) -> str:
    """Clean and normalize text content"""
    if not text:
        return ""
    
    # Remove extra whitespace and normalize
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove common unwanted elements
    unwanted_patterns = [
        r'Cookie Policy.*?Accept',
        r'Privacy Policy.*?Accept',
        r'Terms of Service.*?Accept',
        r'Subscribe to our newsletter',
        r'Follow us on',
        r'© \d{4}.*?All rights reserved',
        r'Powered by.*?',
        r'Skip to content',
        r'Menu',
        r'Home',
        r'About',
        r'Contact',
        r'Login',
        r'Register',
    ]
    
    for pattern in unwanted_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
    
    return text.strip()

def estimate_tokens(text_length: int) -> int:
    """Estimate token count from character length"""
    return max(1, text_length // 4)

def chunk_text(text: str, source_url: str, max_tokens: int = 200, min_tokens: int = 50) -> List[Dict]:
    """Chunk text into smaller pieces for better AI processing"""
    text = clean_text(text)
    if not text:
        return []

    # Convert token limits to char limits
    max_chars = max_tokens * 4
    min_chars = min_tokens * 4

    # Split by multiple delimiters for better chunking
    sentences = re.split(r"(?<=[.!?])\s+|(?<=Learn More)\s+|(?<=Read More)\s+|(?<=Get Started)\s+|(?<=Get in Touch)\s+|(?<=Contact Us)\s+", text)

    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for sentence in sentences:
        s = sentence.strip()
        if not s or len(s) < 10:  # Skip very short sentences
            continue
            
        # If sentence is too long, split it further
        if len(s) > max_chars:
            # Split long sentences by common patterns
            sub_sentences = re.split(r"(?<=\.)\s+|(?<=:)\s+|(?<=-)\s+", s)
            for sub_s in sub_sentences:
                sub_s = sub_s.strip()
                if not sub_s or len(sub_s) < 10:
                    continue
                if current_len + len(sub_s) + 1 > max_chars and current_len >= min_chars:
                    chunks.append(" ".join(current).strip())
                    current = [sub_s]
                    current_len = len(sub_s)
                else:
                    current.append(sub_s)
                    current_len += len(sub_s) + 1
        else:
            if current_len + len(s) + 1 > max_chars and current_len >= min_chars:
                chunks.append(" ".join(current).strip())
                current = [s]
                current_len = len(s)
            else:
                current.append(s)
                current_len += len(s) + 1

    if current:
        if current_len < min_chars and chunks:
            chunks[-1] = (chunks[-1] + " " + " ".join(current)).strip()
        else:
            chunks.append(" ".join(current).strip())

    return [
        {
            "id": f"{hash((source_url, idx, chunk[:40]))}",
            "url": source_url,
            "text": chunk,
            "n_tokens": estimate_tokens(len(chunk)),
        }
        for idx, chunk in enumerate(chunks)
    ]

def process_venturing_data():
    """Process the scraped Venturing Digitally data"""
    print("🔄 Processing Venturing Digitally data...")
    
    # Load scraped data
    data_file = "data/venturing_digitally_data.json"
    if not os.path.exists(data_file):
        print(f"❌ Data file not found: {data_file}")
        return
    
    with open(data_file, 'r', encoding='utf-8') as f:
        scraped_data = json.load(f)
    
    print(f"📊 Loaded {len(scraped_data)} pages")
    
    # Process each page
    all_chunks = []
    all_docs = []
    
    for page in scraped_data:
        url = page['url']
        title = page['title']
        content = page['content']
        category = page['category']
        
        # Create chunks from content
        chunks = chunk_text(content, url)
        
        for chunk in chunks:
            # Add metadata to chunk
            chunk['title'] = title
            chunk['category'] = category
            chunk['page_type'] = get_page_type(url)
            
            all_chunks.append(chunk)
            all_docs.append(chunk)
    
    print(f"📝 Created {len(all_chunks)} chunks from {len(scraped_data)} pages")
    
    # Save chunks
    chunks_file = "data/chunks.jsonl"
    with open(chunks_file, 'w', encoding='utf-8') as f:
        for chunk in all_chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + '\n')
    
    # Save docs
    docs_file = "data/docs.jsonl"
    with open(docs_file, 'w', encoding='utf-8') as f:
        for doc in all_docs:
            f.write(json.dumps(doc, ensure_ascii=False) + '\n')
    
    # Create pages.jsonl
    pages_file = "data/pages.jsonl"
    with open(pages_file, 'w', encoding='utf-8') as f:
        for page in scraped_data:
            f.write(json.dumps(page, ensure_ascii=False) + '\n')
    
    print(f"💾 Saved data to:")
    print(f"  - {chunks_file}")
    print(f"  - {docs_file}")
    print(f"  - {pages_file}")
    
    # Print summary by category
    categories = {}
    for chunk in all_chunks:
        category = chunk.get('category', 'unknown')
        categories[category] = categories.get(category, 0) + 1
    
    print(f"\n📁 Chunks by Category:")
    for category, count in sorted(categories.items()):
        print(f"  {category}: {count} chunks")
    
    print(f"\n✅ Data processing completed successfully!")
    return len(all_chunks)

def get_page_type(url: str) -> str:
    """Determine page type from URL"""
    url_lower = url.lower()
    
    if 'services' in url_lower:
        return 'services'
    elif 'about' in url_lower:
        return 'about'
    elif 'testimonials' in url_lower:
        return 'testimonials'
    elif 'mission' in url_lower or 'vision' in url_lower:
        return 'mission_vision'
    elif 'development' in url_lower and 'process' in url_lower:
        return 'development_process'
    elif 'events' in url_lower:
        return 'events'
    elif 'contact' in url_lower:
        return 'contact'
    elif 'careers' in url_lower:
        return 'careers'
    elif 'blogs' in url_lower or 'insights' in url_lower:
        return 'blog'
    elif 'training' in url_lower or 'internship' in url_lower:
        return 'training'
    elif any(service in url_lower for service in ['website', 'application', 'ui', 'enterprise', 'custom', 'seo', 'digital', 'ai', 'cloud', 'cyber', 'data', 'qa']):
        return 'service_detail'
    elif any(industry in url_lower for industry in ['pharma', 'insurance', 'healthcare', 'construction', 'manufacturing', 'travel', 'oil', 'ecommerce', 'transportation', 'school']):
        return 'industry_solution'
    else:
        return 'general'

if __name__ == "__main__":
    process_venturing_data()
