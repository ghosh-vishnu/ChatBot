import os


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

BASE_URL = os.getenv("BASE_URL", "https://venturingdigitally.com")
OUTPUT_DIR = os.getenv("SCRAPER_OUTPUT_DIR", os.path.join(os.getcwd(), "data"))
RAW_PAGES_JSON = os.path.join(OUTPUT_DIR, "pages.jsonl")
CHUNKS_JSON = os.path.join(OUTPUT_DIR, "chunks.jsonl")

ALLOWED_DOMAINS = [
    os.getenv("ALLOWED_DOMAIN", "venturingdigitally.com"),
]

# Chunking
MAX_TOKENS_PER_CHUNK = int(os.getenv("MAX_TOKENS_PER_CHUNK", "200"))
MIN_TOKENS_PER_CHUNK = int(os.getenv("MIN_TOKENS_PER_CHUNK", "50"))

# Crawl settings
REQUEST_TIMEOUT = 20
MAX_PAGES = int(os.getenv("MAX_PAGES", "200"))
RESPECT_SITEMAP = os.getenv("RESPECT_SITEMAP", "1") == "1"
SITEMAP_URL = os.getenv("SITEMAP_URL", "")

HEADERS = {"User-Agent": os.getenv("SCRAPER_USER_AGENT", DEFAULT_USER_AGENT)}

os.makedirs(OUTPUT_DIR, exist_ok=True)


