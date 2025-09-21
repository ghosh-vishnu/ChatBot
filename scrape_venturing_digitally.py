#!/usr/bin/env python3
"""
Comprehensive scraper for Venturing Digitally website
Scrapes all provided URLs and creates advanced AI model data
"""

import asyncio
import aiohttp
import json
import os
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time
from typing import List, Dict, Set
import re

# All the URLs provided by the user
VENTURING_DIGITALLY_URLS = [
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

class VenturingDigitallyScraper:
    def __init__(self):
        self.session = None
        self.scraped_data = []
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers=self.headers,
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def clean_text(self, text: str) -> str:
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
        ]
        
        for pattern in unwanted_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
        
        return text.strip()
    
    def extract_page_info(self, soup: BeautifulSoup, url: str) -> Dict:
        """Extract comprehensive page information"""
        # Get title
        title = soup.find('title')
        title_text = title.get_text().strip() if title else ""
        
        # Get meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        description = meta_desc.get('content', '').strip() if meta_desc else ""
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        # Extract main content
        main_content = soup.find('main') or soup.find('div', class_='content') or soup.find('body')
        if main_content:
            content_text = main_content.get_text()
        else:
            content_text = soup.get_text()
        
        # Clean the content
        content_text = self.clean_text(content_text)
        
        # Extract headings
        headings = []
        for tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            for heading in soup.find_all(tag):
                heading_text = heading.get_text().strip()
                if heading_text:
                    headings.append({
                        'level': tag,
                        'text': heading_text
                    })
        
        # Extract links
        links = []
        for link in soup.find_all('a', href=True):
            href = link.get('href')
            link_text = link.get_text().strip()
            if href and link_text:
                links.append({
                    'url': urljoin(url, href),
                    'text': link_text
                })
        
        # Extract images with alt text
        images = []
        for img in soup.find_all('img', alt=True):
            alt_text = img.get('alt', '').strip()
            src = img.get('src', '')
            if alt_text and src:
                images.append({
                    'src': urljoin(url, src),
                    'alt': alt_text
                })
        
        # Determine page category based on URL
        page_category = self.categorize_page(url)
        
        return {
            'url': url,
            'title': title_text,
            'description': description,
            'content': content_text,
            'headings': headings,
            'links': links,
            'images': images,
            'category': page_category,
            'scraped_at': time.time()
        }
    
    def categorize_page(self, url: str) -> str:
        """Categorize page based on URL"""
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
    
    async def scrape_url(self, url: str) -> Dict:
        """Scrape a single URL"""
        try:
            print(f"Scraping: {url}")
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    page_info = self.extract_page_info(soup, url)
                    print(f"✓ Successfully scraped: {url}")
                    return page_info
                else:
                    print(f"✗ Failed to scrape {url}: HTTP {response.status}")
                    return None
        except Exception as e:
            print(f"✗ Error scraping {url}: {str(e)}")
            return None
    
    async def scrape_all_urls(self) -> List[Dict]:
        """Scrape all URLs concurrently"""
        print(f"Starting to scrape {len(VENTURING_DIGITALLY_URLS)} URLs...")
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(5)
        
        async def scrape_with_semaphore(url):
            async with semaphore:
                return await self.scrape_url(url)
        
        # Scrape all URLs concurrently
        tasks = [scrape_with_semaphore(url) for url in VENTURING_DIGITALLY_URLS]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out None results and exceptions
        successful_results = []
        for result in results:
            if isinstance(result, dict) and result is not None:
                successful_results.append(result)
            elif isinstance(result, Exception):
                print(f"Exception occurred: {result}")
        
        print(f"Successfully scraped {len(successful_results)} out of {len(VENTURING_DIGITALLY_URLS)} URLs")
        return successful_results
    
    def save_data(self, data: List[Dict], filename: str = "venturing_digitally_data.json"):
        """Save scraped data to file"""
        os.makedirs("data", exist_ok=True)
        filepath = os.path.join("data", filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Data saved to: {filepath}")
        return filepath

async def main():
    """Main function to run the scraper"""
    print("🚀 Starting Venturing Digitally Website Scraper")
    print("=" * 50)
    
    async with VenturingDigitallyScraper() as scraper:
        # Scrape all URLs
        scraped_data = await scraper.scrape_all_urls()
        
        if scraped_data:
            # Save the data
            filepath = scraper.save_data(scraped_data)
            
            # Print summary
            print("\n📊 Scraping Summary:")
            print("=" * 30)
            print(f"Total URLs: {len(VENTURING_DIGITALLY_URLS)}")
            print(f"Successfully scraped: {len(scraped_data)}")
            print(f"Failed: {len(VENTURING_DIGITALLY_URLS) - len(scraped_data)}")
            
            # Print categories
            categories = {}
            for page in scraped_data:
                category = page.get('category', 'unknown')
                categories[category] = categories.get(category, 0) + 1
            
            print("\n📁 Page Categories:")
            for category, count in categories.items():
                print(f"  {category}: {count} pages")
            
            print(f"\n💾 Data saved to: {filepath}")
            print("\n✅ Scraping completed successfully!")
        else:
            print("❌ No data was scraped successfully")

if __name__ == "__main__":
    asyncio.run(main())
