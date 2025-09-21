Website RAG Chatbot

A full-stack chatbot that answers only using your website content. It scrapes your site, chunks text, stores embeddings in ChromaDB, and serves a FastAPI `/chat` endpoint consumed by a React + Tailwind widget.

Project Structure

```
/scraper      # Crawl website and produce chunks.jsonl
/backend      # FastAPI app, ChromaDB integration, ingestion
/frontend     # React + Tailwind chat widget (Vite)
requirements.txt
scheduler.py  # Weekly re-crawl runner
```

Prerequisites
- Python 3.10+
- Node.js 18+
- An OpenAI API key

Setup

1) Install Python deps
```
cd C:\Users\Vishnu\Desktop\Vedu
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
```

2) Configure environment (PowerShell)
```
$env:BASE_URL = "https://yourdomain.com"
$env:ALLOWED_DOMAIN = "yourdomain.com"
$env:OPENAI_API_KEY = "sk-..."
$env:EMBED_MODEL = "text-embedding-3-large"
$env:CHAT_MODEL = "gpt-4o-mini"
$env:DATA_DIR = ".\\data"
$env:CHROMA_DIR = ".\\chroma"
```

3) Run scraper and build index
```
python -m scraper.scrape
python -m backend.ingest
```

4) Start backend
```
uvicorn backend.app:app --reload --port 8000
```

5) Start frontend
```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and use the chat widget. The frontend proxies `/chat` to `http://localhost:8000` during development.

Production notes
- Set `CORS_ORIGINS` to your site origin(s).
- Serve FastAPI behind a reverse proxy.
- Persist `data/` and `chroma/` volumes.

Re-crawl weekly
```
python .\scheduler.py
```
Or schedule:
```
python -m scraper.scrape; python -m backend.ingest
```

Safety and fallback behavior
- If no relevant context is found, the API returns: "Sorry, I couldn’t find this information on our website."
- API errors: returns 500 with message.

Troubleshooting
- No answers: Verify `chunks.jsonl` exists and ingestion ran. Ensure `ALLOWED_DOMAIN` matches your site.
- Embeddings fail: Confirm `OPENAI_API_KEY` and network egress.
- CORS issues: Set `CORS_ORIGINS` appropriately or proxy through your site.


