#!/usr/bin/env python3
"""Build page-map.json: maps each book page number to its PDF filename and page offset within that PDF."""

import json
import re
from pathlib import Path

PDF_DIR = Path.home() / "Downloads" / "西安回族方言"
OUTPUT = Path(__file__).parent.parent / "website" / "public" / "page-map.json"


def main():
    if not PDF_DIR.exists():
        print(f"Error: PDF directory not found: {PDF_DIR}")
        return

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {PDF_DIR}")
        return

    page_map = {}
    for pdf in pdfs:
        # Parse range from filename like "8-19.pdf" or "8-19 (1).pdf"
        m = re.match(r'^(\d+)-(\d+)', pdf.name)
        if not m:
            print(f"Skipping unrecognized filename: {pdf.name}")
            continue
        start_page = int(m.group(1))
        end_page = int(m.group(2))
        for book_page in range(start_page, end_page + 1):
            pdf_page = book_page - start_page + 1  # 1-based offset within PDF
            page_map[str(book_page)] = {
                "pdf": pdf.name,
                "pdfPage": pdf_page,
            }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(page_map, f, ensure_ascii=False, indent=2)

    print(f"Mapped {len(page_map)} book pages across {len(pdfs)} PDFs")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    main()
