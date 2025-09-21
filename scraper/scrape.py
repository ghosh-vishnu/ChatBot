from __future__ import annotations

import requests
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Optional
import re

from .config import BASE_URL, ALLOWED_DOMAINS, REQUEST_TIMEOUT, HEADERS
from .chunk_utils import chunk_text, clean_text

def fetch_page(url: str) -> Optional[str]:
    """Fetch the content of a given URL"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def extract_content(html: str) -> str:
    """Extract main textual content from HTML"""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Remove script, style, nav, footer, header, and other non-content tags
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'noscript']):
        tag.decompose()
    
    # Get text from main content areas
    main_content = soup.find('main') or soup.find('article') or soup.find('body')
    if main_content:
        text = main_content.get_text(separator=' ', strip=True)
    else:
        text = soup.get_text(separator=' ', strip=True)
    
    # Clean up extra whitespace and newlines
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_metadata(soup: BeautifulSoup) -> Dict:
    """Extract metadata like title and description"""
    title = soup.find('title').get_text(strip=True) if soup.find('title') else ''
    description = ''
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    if meta_desc and 'content' in meta_desc.attrs:
        description = meta_desc['content'].strip()
    
    return {
        'title': title,
        'description': description
    }

def is_allowed_url(url: str) -> bool:
    """Check if URL is in allowed domains"""
    parsed = urlparse(url)
    return any(domain in parsed.netloc for domain in ALLOWED_DOMAINS)

def scrape_url(url: str) -> Optional[Dict]:
    """Scrape a single URL and return structured data"""
    if not is_allowed_url(url):
        print(f"URL not allowed: {url}")
        return None
    
    html_content = fetch_page(url)
    if not html_content:
        return None
    
    soup = BeautifulSoup(html_content, 'html.parser')
    metadata = extract_metadata(soup)
    content = extract_content(html_content)
    
    return {
        'url': url,
        'title': metadata['title'],
        'description': metadata['description'],
        'content': content,
        'scraped_at': time.time()
    }

def scrape_website(start_url: str, max_pages: int = 50) -> List[Dict]:
    """Scrape website starting from a URL"""
    scraped_pages = []
    visited_urls = set()
    urls_to_visit = [start_url]
    
    while urls_to_visit and len(scraped_pages) < max_pages:
        url = urls_to_visit.pop(0)
        
        if url in visited_urls:
            continue
        
        visited_urls.add(url)
        print(f"Scraping: {url}")
        
        page_data = scrape_url(url)
        if page_data:
            scraped_pages.append(page_data)
            
            # Find more URLs to scrape
            try:
                response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    full_url = urljoin(url, href)
                    
                    if (is_allowed_url(full_url) and 
                        full_url not in visited_urls and 
                        full_url not in urls_to_visit):
                        urls_to_visit.append(full_url)
            except:
                pass
        
        time.sleep(1)  # Be polite to the server
    
    return scraped_pages

if __name__ == "__main__":
    # Example usage
    pages = scrape_website(BASE_URL, max_pages=10)
    print(f"Scraped {len(pages)} pages")
