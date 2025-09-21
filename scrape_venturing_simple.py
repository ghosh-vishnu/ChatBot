#!/usr/bin/env python3
"""
Simple scraper for Venturing Digitally website using existing dependencies
"""

import requests
import json
import os
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re
from typing import List, Dict

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
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        })
        self.scraped_data = []
        
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
        
        # Determine page category based on URL
        page_category = self.categorize_page(url)
        
        return {
            'url': url,
            'title': title_text,
            'description': description,
            'content': content_text,
            'headings': headings,
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
    
    def scrape_url(self, url: str) -> Dict:
        """Scrape a single URL"""
        try:
            print(f"Scraping: {url}")
            response = self.session.get(url, timeout=30)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                page_info = self.extract_page_info(soup, url)
                print(f"✓ Successfully scraped: {url}")
                return page_info
            else:
                print(f"✗ Failed to scrape {url}: HTTP {response.status_code}")
                return None
        except Exception as e:
            print(f"✗ Error scraping {url}: {str(e)}")
            return None
    
    def scrape_all_urls(self) -> List[Dict]:
        """Scrape all URLs"""
        print(f"Starting to scrape {len(VENTURING_DIGITALLY_URLS)} URLs...")
        
        successful_results = []
        for i, url in enumerate(VENTURING_DIGITALLY_URLS, 1):
            print(f"[{i}/{len(VENTURING_DIGITALLY_URLS)}] ", end="")
            result = self.scrape_url(url)
            if result:
                successful_results.append(result)
            
            # Add delay to be respectful
            time.sleep(1)
        
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

def main():
    """Main function to run the scraper"""
    print("🚀 Starting Venturing Digitally Website Scraper")
    print("=" * 50)
    
    scraper = VenturingDigitallyScraper()
    
    # Scrape all URLs
    scraped_data = scraper.scrape_all_urls()
    
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
    main()
