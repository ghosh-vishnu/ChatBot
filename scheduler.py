from __future__ import annotations

import os
import time
import schedule


def run_job():
    base_url = os.getenv("BASE_URL", "https://example.com")
    print("[scheduler] Running crawl + ingest job...")
    os.system("python -m scraper.scrape")
    os.system("python -m backend.ingest")
    print("[scheduler] Job complete.")


def main():
    # Weekly at 02:00 on Monday
    schedule.every().monday.at("02:00").do(run_job)
    print("Scheduler started. Press Ctrl+C to exit.")
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()


