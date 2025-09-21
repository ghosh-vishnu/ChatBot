from __future__ import annotations

import re
from typing import List, Dict


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def estimate_tokens(chars: int) -> int:
    # Rough estimate: ~4 chars per token in English
    return max(1, chars // 4)


def chunk_text(
    text: str,
    source_url: str,
    max_tokens: int,
    min_tokens: int,
    model: str = "text-embedding-3-large",
) -> List[Dict]:
    text = clean_text(text)
    if not text:
        return []

    # Convert token limits to char limits using heuristic
    max_chars = max_tokens * 4
    min_chars = min_tokens * 4

    # Split by multiple delimiters for better chunking
    sentences = re.split(r"(?<=[.!?])\s+|(?<=Learn More)\s+|(?<=Read More)\s+|(?<=Get Started)\s+|(?<=Get in Touch)\s+", text)

    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for sentence in sentences:
        s = sentence.strip()
        if not s or len(s) < 10:  # Skip very short sentences
            continue
            
        # If sentence is too long, split it further
        if len(s) > max_chars:
            # Split long sentences by common patterns
            sub_sentences = re.split(r"(?<=\.)\s+|(?<=:)\s+|(?<=-)\s+", s)
            for sub_s in sub_sentences:
                sub_s = sub_s.strip()
                if not sub_s or len(sub_s) < 10:
                    continue
                if current_len + len(sub_s) + 1 > max_chars and current_len >= min_chars:
                    chunks.append(" ".join(current).strip())
                    current = [sub_s]
                    current_len = len(sub_s)
                else:
                    current.append(sub_s)
                    current_len += len(sub_s) + 1
        else:
            if current_len + len(s) + 1 > max_chars and current_len >= min_chars:
                chunks.append(" ".join(current).strip())
                current = [s]
                current_len = len(s)
            else:
                current.append(s)
                current_len += len(s) + 1

    if current:
        if current_len < min_chars and chunks:
            chunks[-1] = (chunks[-1] + " " + " ".join(current)).strip()
        else:
            chunks.append(" ".join(current).strip())

    return [
        {
            "id": f"{hash((source_url, idx, chunk[:40]))}",
            "url": source_url,
            "text": chunk,
            "n_tokens": estimate_tokens(len(chunk)),
        }
        for idx, chunk in enumerate(chunks)
    ]


