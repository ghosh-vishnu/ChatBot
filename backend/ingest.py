from __future__ import annotations

import json
from typing import Iterable, Dict, Any, List

from .config import CHUNKS_JSON
from .db import upsert_chunks


def read_jsonl(path: str) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def ingest_from_jsonl(jsonl_path: str | None = None) -> int:
    path = jsonl_path or str(CHUNKS_JSON)
    batch: List[Dict[str, Any]] = []
    total = 0
    for rec in read_jsonl(path):
        batch.append(rec)
        if len(batch) >= 100:
            upsert_chunks(batch)
            total += len(batch)
            batch = []
    if batch:
        upsert_chunks(batch)
        total += len(batch)
    return total


if __name__ == "__main__":
    n = ingest_from_jsonl()
    print(f"Ingested {n} chunks")


