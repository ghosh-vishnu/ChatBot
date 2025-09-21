import os
from pathlib import Path
from dotenv import load_dotenv


BASE_DIR = Path(os.getcwd())
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
CHUNKS_JSON = Path(os.getenv("CHUNKS_JSON", DATA_DIR / "chunks.jsonl"))

load_dotenv(dotenv_path=BASE_DIR / ".env", override=False)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-large")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

TOP_K = int(os.getenv("TOP_K", "4"))
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "12000"))

DATA_DIR.mkdir(parents=True, exist_ok=True)


