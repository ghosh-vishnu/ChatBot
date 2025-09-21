from __future__ import annotations

import requests
from bs4 import BeautifulSoup
import json
import time
from urllib.parse import urljoin, urlparse
import os
from typing import List, Dict, Any, Optional
import re

# Configuration
BASE_URL = "https://venturingdigitally.com"
OUTPUT_FILE = "data/venturing_digitally_data.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}
REQUEST_TIMEOUT = 10

# List of URLs to scrape
URLS_TO_SCRAPE = [
    "https://venturingdigitally.com",
    "https://venturingdigitally.com/services",
    "https://venturingdigitally.com/AboutCompany",
    "https://venturingdigitally.com/Testimonials",
    "https://venturingdigitally.com/MissionVision",
    "https://venturingdigitally.com/DevelopmentProcess",
    "https://venturingdigitally.com/Events",
    "https://venturingdigitally.com/CustomizePharmaSoftware",
    "https://venturingdigitally.com/WebsiteDevelopment",
    "https://venturingdigitally.com/ApplicationDevelopment",
    "https://venturingdigitally.com/UIUXDesign",
    "https://venturingdigitally.com/EnterpriseSoftware",
    "https://venturingdigitally.com/CustomSoftware",
    "https://venturingdigitally.com/BrandReputation",
    "https://venturingdigitally.com/SupportMaintenance",
    "https://venturingdigitally.com/Seo",
    "https://venturingdigitally.com/DigitalMarketing",
    "https://venturingdigitally.com/AI-ML",
    "https://venturingdigitally.com/CloudServices",
    "https://venturingdigitally.com/MVPConsulting",
    "https://venturingdigitally.com/QaTesting",
    "https://venturingdigitally.com/CyberSecurity",
    "https://venturingdigitally.com/DataAnalytics",
    "https://venturingdigitally.com/DocumentManagement",
    "https://venturingdigitally.com/qms",
    "https://venturingdigitally.com/ProjectManagement",
    "https://venturingdigitally.com/Insurance",
    "https://venturingdigitally.com/WebPortal",
    "https://venturingdigitally.com/SchoolCollege",
    "https://venturingdigitally.com/Hrms",
    "https://venturingdigitally.com/Cms",
    "https://venturingdigitally.com/EcommerceSolutions",
    "https://venturingdigitally.com/OperationManagement",
    "https://venturingdigitally.com/Construction",
    "https://venturingdigitally.com/Manufacturing",
    "https://venturingdigitally.com/Healthcare",
    "https://venturingdigitally.com/TravelHospitality",
    "https://venturingdigitally.com/OilGas",
    "https://venturingdigitally.com/Ecommerce",
    "https://venturingdigitally.com/TransportationLogistic",
    "https://venturingdigitally.com/SchoolUniversity",
    "https://venturingdigitally.com/Blogs",
    "https://venturingdigitally.com/Insights",
    "https://venturingdigitally.com/Careers",
    "https://venturingdigitally.com/training-and-internship",
    "https://venturingdigitally.com/ContactUs"
]

def fetch_page(url: str) -> Optional[str]:
    """Fetch the content of a given URL"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()  # Raise an exception for HTTP errors
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def extract_content(html: str) -> str:
    """Extract main textual content from HTML"""
    soup = BeautifulSoup(html, 'html.parser')
    # Remove script, style, nav, footer, header, and other non-content tags
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'noscript', 'svg', 'img']):
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
    return {'title': title, 'description': description}

def categorize_url(url: str) -> str:
    """Categorize a URL based on its path"""
    path = urlparse(url).path.lower()
    if '/services' in path:
        if path.count('/') > 2: # e.g., /services/websitedevelopment
            return 'service_detail'
        return 'services'
    elif '/aboutcompany' in path:
        return 'about'
    elif '/testimonials' in path:
        return 'testimonials'
    elif '/missionvision' in path:
        return 'mission_vision'
    elif '/developmentprocess' in path:
        return 'development_process'
    elif '/events' in path:
        return 'events'
    elif '/blogs' in path or '/insights' in path:
        return 'blog'
    elif '/careers' in path:
        return 'careers'
    elif '/training-and-internship' in path:
        return 'training'
    elif '/contactus' in path:
        return 'contact'
    elif path == '/':
        return 'homepage'
    return 'general'

def scrape_urls(urls: List[str]) -> List[Dict]:
    """Scrape a list of URLs and return structured data"""
    scraped_data = []
    successful_scrapes = 0
    failed_scrapes = 0
    
    print(f"🚀 Starting Venturing Digitally Website Scraper")
    print(f"==================================================")
    print(f"Starting to scrape {len(urls)} URLs...")

    for i, url in enumerate(urls):
        print(f"[{i+1}/{len(urls)}] Scraping: {url}")
        html_content = fetch_page(url)
        if html_content:
            soup = BeautifulSoup(html_content, 'html.parser')
            metadata = extract_metadata(soup)
            content = extract_content(html_content) # Extract content after metadata
            category = categorize_url(url)
            
            scraped_data.append({
                'url': url,
                'title': metadata['title'],
                'description': metadata['description'],
                'content': content,
                'headings': [h.get_text(strip=True) for h in soup.find_all(re.compile('^h[1-6]$'))],
                'category': category,
                'scraped_at': time.time()
            })
            print(f"✓ Successfully scraped: {url}")
            successful_scrapes += 1
        else:
            print(f"✗ Failed to scrape: {url}")
            failed_scrapes += 1
        time.sleep(0.5) # Be polite to the server

    print(f"Successfully scraped {successful_scrapes} out of {len(urls)} URLs")
    if failed_scrapes > 0:
        print(f"Failed to scrape {failed_scrapes} URLs.")
    
    return scraped_data

def save_data(data: List[Dict], output_path: str):
    """Save scraped data to a JSON file"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Data saved to: {output_path}")

if __name__ == "__main__":
    scraped_pages = scrape_urls(URLS_TO_SCRAPE)
    save_data(scraped_pages, OUTPUT_FILE)
    
    # Summary statistics
    categories = {}
    for page in scraped_pages:
        cat = page.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\n📊 Scraping Summary:")
    print("==============================")
    print(f"Total URLs: {len(URLS_TO_SCRAPE)}")
    print(f"Successfully scraped: {len(scraped_pages)}")
    print(f"Failed: {len(URLS_TO_SCRAPE) - len(scraped_pages)}")
    print("\n📁 Page Categories:")
    for cat, count in categories.items():
        print(f"  {cat}: {count} pages")
    print(f"\n💾 Data saved to: {OUTPUT_FILE}")
    print("\n✅ Scraping completed successfully!")
