#!/usr/bin/env python3
"""Generate OpenAI embeddings for all dictionary entries and save to embeddings.json.

Run after parse_dictionary.py to regenerate embeddings whenever dictionary.json changes.
Requires: pip install openai
Requires env var: OPENAI_API_KEY
"""

import json
import os
import time
from pathlib import Path

from openai import OpenAI

DICTIONARY_PATH = Path(__file__).parent.parent / "website" / "public" / "dictionary.json"
OUTPUT_PATH = Path(__file__).parent.parent / "website" / "public" / "embeddings.json"
MODEL = "text-embedding-3-small"
BATCH_SIZE = 100  # OpenAI allows up to 2048 inputs per batch


def entry_to_text(entry: dict) -> str:
    """Convert a dictionary entry to a text string for embedding.
    Uses rawText so Arabic/Persian script, IPA, and notes are all included.
    Falls back to structured fields if rawText is missing.
    """
    if entry.get("rawText"):
        return entry["rawText"]
    # fallback
    parts = [entry.get("headword", ""), entry.get("pinyin", "")]
    parts.append(" ".join(entry.get("originLanguages", [])))
    for defn in entry.get("definitions", []):
        parts.append(defn.get("meaning", ""))
        parts.extend(defn.get("examples", []))
        parts.append(defn.get("notes", ""))
    return " ".join(p for p in parts if p)


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not set")
        return

    client = OpenAI(api_key=api_key)

    with open(DICTIONARY_PATH, encoding="utf-8") as f:
        data = json.load(f)

    entries = data["entries"]
    print(f"Generating embeddings for {len(entries)} entries...")

    # Load existing embeddings to skip already-processed entries
    existing = {}
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            for item in json.load(f):
                existing[item["id"]] = item["embedding"]
        print(f"  Found {len(existing)} existing embeddings, skipping those")

    results = list(existing.items())  # (id, embedding) pairs already done
    to_process = [e for e in entries if e["id"] not in existing]

    if not to_process:
        print("All entries already embedded. Nothing to do.")
        return

    # Process in batches
    for i in range(0, len(to_process), BATCH_SIZE):
        batch = to_process[i:i + BATCH_SIZE]
        texts = [entry_to_text(e) for e in batch]
        ids = [e["id"] for e in batch]

        print(f"  Batch {i // BATCH_SIZE + 1}: embedding {len(batch)} entries...")
        response = client.embeddings.create(model=MODEL, input=texts)
        for entry_id, emb_obj in zip(ids, response.data):
            results.append((entry_id, emb_obj.embedding))

        # Small delay to avoid rate limits
        if i + BATCH_SIZE < len(to_process):
            time.sleep(0.2)

    # Write output
    output = [{"id": eid, "embedding": emb} for eid, emb in results]
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    size_mb = OUTPUT_PATH.stat().st_size / 1_000_000
    print(f"Saved {len(output)} embeddings to {OUTPUT_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
