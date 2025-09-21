from __future__ import annotations

import requests
from bs4 import BeautifulSoup
import json
import time
import os
from typing import List, Dict, Any, Optional
import re

# Simple scraper for Venturing Digitally
BASE_URL = "https://venturingdigitally.com"
OUTPUT_FILE = "data/venturing_digitally_simple.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def fetch_page(url: str) -> Optional[str]:
    """Fetch page content"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def extract_text(html: str) -> str:
    """Extract text content"""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Remove unwanted tags
    for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()
    
    # Get main content
    main = soup.find('main') or soup.find('body')
    if main:
        text = main.get_text(separator=' ', strip=True)
    else:
        text = soup.get_text(separator=' ', strip=True)
    
    # Clean up
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def scrape_simple():
    """Simple scraping function"""
    print("🚀 Starting simple scraper...")
    
    # Main pages to scrape
    urls = [
        "https://venturingdigitally.com",
        "https://venturingdigitally.com/services",
        "https://venturingdigitally.com/AboutCompany",
        "https://venturingdigitally.com/ContactUs"
    ]
    
    results = []
    
    for url in urls:
        print(f"Scraping: {url}")
        html = fetch_page(url)
        if html:
            text = extract_text(html)
            results.append({
                'url': url,
                'content': text,
                'scraped_at': time.time()
            })
            print(f"✓ Success: {url}")
        else:
            print(f"✗ Failed: {url}")
        
        time.sleep(1)
    
    # Save results
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Scraped {len(results)} pages")
    print(f"💾 Saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_simple()
