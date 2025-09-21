from __future__ import annotations

import schedule
import time
import os
from datetime import datetime

def run_weekly_scrape():
    """Run weekly scraping and data processing"""
    print(f"Starting weekly scrape at {datetime.now()}")
    
    try:
        # Run the knowledge base creation script
        os.system("python create_venturing_knowledge_base.py")
        print("✅ Weekly scrape completed successfully")
    except Exception as e:
        print(f"❌ Error during weekly scrape: {e}")

def main():
    """Main scheduler function"""
    print("🕐 Starting scheduler...")
    
    # Schedule weekly scraping every Sunday at 2 AM
    schedule.every().sunday.at("02:00").do(run_weekly_scrape)
    
    print("📅 Scheduled weekly scraping for every Sunday at 2:00 AM")
    
    # Keep the scheduler running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
