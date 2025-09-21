from __future__ import annotations

import json
import re
import time
from collections import deque
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from .config import (
    BASE_URL,
    RAW_PAGES_JSON,
    CHUNKS_JSON,
    ALLOWED_DOMAINS,
    HEADERS,
    REQUEST_TIMEOUT,
    MAX_PAGES,
    RESPECT_SITEMAP,
    SITEMAP_URL,
    MAX_TOKENS_PER_CHUNK,
    MIN_TOKENS_PER_CHUNK,
)
from .chunk_utils import chunk_text, clean_text


def is_allowed(url: str) -> bool:
    hostname = urlparse(url).hostname or ""
    return any(hostname.endswith(dom) for dom in ALLOWED_DOMAINS)


def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "img", "footer", "nav"]):
        tag.decompose()
    text = soup.get_text(" ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def fetch(url: str) -> tuple[int, str]:
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    return resp.status_code, resp.text


def parse_sitemap(url: str) -> list[str]:
    try:
        status, text = fetch(url)
        if status != 200:
            return []
        soup = BeautifulSoup(text, "xml")
        return [loc.get_text() for loc in soup.find_all("loc")]
    except Exception:
        return []


def crawl(start_url: str) -> None:
    visited: set[str] = set()
    queue: deque[str] = deque()

    if RESPECT_SITEMAP:
        sitemap_url = SITEMAP_URL or urljoin(start_url, "/sitemap.xml")
        urls = parse_sitemap(sitemap_url)
        if urls:
            for u in urls:
                if is_allowed(u):
                    queue.append(u)
    if not queue:
        queue.append(start_url)

    pages_out = open(RAW_PAGES_JSON, "w", encoding="utf-8")
    chunks_out = open(CHUNKS_JSON, "w", encoding="utf-8")

    pages_count = 0

    try:
        while queue and pages_count < MAX_PAGES:
            url = queue.popleft()
            if url in visited or not is_allowed(url):
                continue
            visited.add(url)

            try:
                status, html = fetch(url)
                if status != 200:
                    continue
                text = extract_text_from_html(html)
                record = {"url": url, "text": text}
                pages_out.write(json.dumps(record, ensure_ascii=False) + "\n")

                for chunk in chunk_text(
                    text=text,
                    source_url=url,
                    max_tokens=MAX_TOKENS_PER_CHUNK,
                    min_tokens=MIN_TOKENS_PER_CHUNK,
                ):
                    chunks_out.write(json.dumps(chunk, ensure_ascii=False) + "\n")

                pages_count += 1

                # Enqueue internal links
                soup = BeautifulSoup(html, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a.get("href")
                    next_url = urljoin(url, href)
                    if next_url.startswith("http") and is_allowed(next_url) and next_url not in visited:
                        queue.append(next_url)
            except Exception:
                continue
            time.sleep(0.2)
    finally:
        pages_out.close()
        chunks_out.close()


if __name__ == "__main__":
    crawl(BASE_URL)


