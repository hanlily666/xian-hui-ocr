#!/usr/bin/env python3
"""OCR pipeline for 西安回族方言 scanned PDFs using PaddleOCR."""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np
from PIL import Image
import io

from paddleocr import PaddleOCR

# Logical ordering of scanned PDFs (scanner naming convention)
PDF_ORDER = [
    "KIC Document 0001.pdf",
    "KIC Document 0001 (1).pdf",
    "KIC Document 0002.pdf",
    "KIC Document 0002 (1).pdf",
    "KIC Document 0003.pdf",
]


def parse_args():
    parser = argparse.ArgumentParser(description="OCR pipeline for 西安回族方言")
    parser.add_argument(
        "--input-dir",
        default=os.path.expanduser("~/Downloads/西安回族方言"),
        help="Source PDF folder",
    )
    parser.add_argument("--output-dir", default="./output", help="Output folder")
    parser.add_argument("--dpi", type=int, default=300, help="Render resolution")
    parser.add_argument(
        "--pages", default=None, help='Page slice per file, e.g. "0:2" for first 2 pages'
    )
    parser.add_argument("--file", default=None, help="Process only this PDF filename")
    parser.add_argument(
        "--save-images", action="store_true", help="Save rendered page PNGs for debugging"
    )
    return parser.parse_args()


def get_pdf_files(input_dir, single_file=None):
    """Return list of PDF paths in logical order."""
    if single_file:
        path = os.path.join(input_dir, single_file)
        if not os.path.exists(path):
            raise FileNotFoundError(f"PDF not found: {path}")
        return [path]

    files = []
    for name in PDF_ORDER:
        path = os.path.join(input_dir, name)
        if os.path.exists(path):
            files.append(path)
    if not files:
        # Fall back to any PDFs found
        files = sorted(Path(input_dir).glob("*.pdf"))
        files = [str(f) for f in files]
    return files


def parse_page_slice(pages_arg):
    """Parse a slice string like '0:2' into a Python slice."""
    if pages_arg is None:
        return None
    parts = pages_arg.split(":")
    start = int(parts[0]) if parts[0] else None
    end = int(parts[1]) if len(parts) > 1 and parts[1] else None
    return slice(start, end)


def render_pages(pdf_path, dpi=300, page_slice=None):
    """Render PDF pages to PNG images using PyMuPDF."""
    doc = fitz.open(pdf_path)
    page_indices = list(range(len(doc)))
    if page_slice:
        page_indices = page_indices[page_slice]

    results = []
    for page_num in page_indices:
        page = doc[page_num]
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
        results.append((page_num, img_bytes, (pix.width, pix.height)))
    doc.close()
    return results


def sort_blocks(blocks):
    """Sort text blocks into reading order: top-to-bottom, left-to-right."""
    def sort_key(block):
        bbox = block["bbox"]
        cy = (bbox[0][1] + bbox[2][1]) / 2
        cx = (bbox[0][0] + bbox[2][0]) / 2
        line_y = round(cy / 30) * 30
        return (line_y, cx)
    return sorted(blocks, key=sort_key)


def ocr_page(ocr_engine, img_bytes):
    """Run PaddleOCR on a page image and return structured blocks."""
    img = np.array(Image.open(io.BytesIO(img_bytes)))
    result = ocr_engine.ocr(img, cls=True)

    blocks = []
    if result and result[0]:
        for line in result[0]:
            bbox = [[float(p[0]), float(p[1])] for p in line[0]]
            text = line[1][0]
            confidence = float(line[1][1])
            blocks.append({"text": text, "confidence": confidence, "bbox": bbox})

    blocks = sort_blocks(blocks)
    raw_text = "\n".join(b["text"] for b in blocks)
    return blocks, raw_text


def main():
    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    # Initialize PaddleOCR
    print("Initializing PaddleOCR (downloading models on first run)...")
    ocr_engine = PaddleOCR(
        use_angle_cls=True,
        lang="ch",
        use_gpu=False,
        show_log=False,
    )

    # Collect PDFs
    pdf_files = get_pdf_files(args.input_dir, args.file)
    page_slice = parse_page_slice(args.pages)

    print(f"Processing {len(pdf_files)} PDF(s) from: {args.input_dir}")

    all_pages = []
    total_pages_in_source = 0
    global_page_idx = 0

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"\n--- {filename} ---")

        # Count total pages
        doc = fitz.open(pdf_path)
        total_pages_in_source += len(doc)
        doc.close()

        # Render
        rendered = render_pages(pdf_path, dpi=args.dpi, page_slice=page_slice)
        print(f"  Rendering {len(rendered)} page(s) at {args.dpi} DPI")

        for page_num, img_bytes, page_size in rendered:
            global_page_idx += 1
            print(f"  OCR page {page_num + 1} ({page_size[0]}x{page_size[1]})...", end=" ", flush=True)

            # Save debug image
            if args.save_images:
                img_path = os.path.join(
                    args.output_dir,
                    f"{Path(filename).stem}_p{page_num + 1}.png",
                )
                with open(img_path, "wb") as f:
                    f.write(img_bytes)

            # OCR
            blocks, raw_text = ocr_page(ocr_engine, img_bytes)
            print(f"{len(blocks)} blocks, {len(raw_text)} chars")

            all_pages.append({
                "file": filename,
                "page_num": page_num,
                "page_size": list(page_size),
                "raw_text": raw_text,
                "blocks": blocks,
            })

    # Write JSON output
    output = {
        "metadata": {
            "source_dir": args.input_dir,
            "processed_at": datetime.now().isoformat(),
            "dpi": args.dpi,
            "total_pages_in_source": total_pages_in_source,
            "pages_processed": len(all_pages),
        },
        "pages": all_pages,
    }

    json_path = os.path.join(args.output_dir, "ocr_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nJSON output: {json_path}")

    # Write plain text dump
    txt_path = os.path.join(args.output_dir, "ocr_text.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        for page in all_pages:
            f.write(f"=== {page['file']} | Page {page['page_num'] + 1} ===\n")
            f.write(page["raw_text"])
            f.write("\n\n")
    print(f"Text output: {txt_path}")
    print(f"\nDone! Processed {len(all_pages)} pages.")


if __name__ == "__main__":
    main()
