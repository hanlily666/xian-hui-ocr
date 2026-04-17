#!/usr/bin/env python3
"""OCR pipeline using PaddleOCR Cloud API (PaddleOCR-VL-1.5) for 西安回族方言."""

import json
import os
import requests
import sys
import time

JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
TOKEN = os.environ.get("PADDLEOCR_TOKEN", "9fa9162054cabb045bc2f6f7fef816f2077f9e16")
MODEL = "PaddleOCR-VL-1.5"

OPTIONAL_PAYLOAD = {
    "markdownIgnoreLabels": [
        "header",
        "header_image",
        "footer",
        "footer_image",
        "number",
        "footnote",
        "aside_text"
    ],
    "useDocOrientationClassify": False,
    "useDocUnwarping": False,
    "useLayoutDetection": True,
    "useChartRecognition": False,
    "useSealRecognition": True,
    "useOcrForImageBlock": False,
    "mergeTables": True,
    "relevelTitles": True,
    "layoutShapeMode": "auto",
    "promptLabel": "ocr",
    "repetitionPenalty": 1,
    "temperature": 0,
    "topP": 1,
    "minPixels": 147384,
    "maxPixels": 2822400,
    "layoutNms": True,
    "restructurePages": True
}


def submit_job(file_path):
    """Submit a file to PaddleOCR cloud API."""
    headers = {"Authorization": f"bearer {TOKEN}"}

    if file_path.startswith("http"):
        headers["Content-Type"] = "application/json"
        payload = {
            "fileUrl": file_path,
            "model": MODEL,
            "optionalPayload": OPTIONAL_PAYLOAD
        }
        return requests.post(JOB_URL, json=payload, headers=headers)
    else:
        if not os.path.exists(file_path):
            print(f"Error: File not found at {file_path}")
            sys.exit(1)
        data = {
            "model": MODEL,
            "optionalPayload": json.dumps(OPTIONAL_PAYLOAD)
        }
        with open(file_path, "rb") as f:
            files = {"file": f}
            return requests.post(JOB_URL, headers=headers, data=data, files=files)


def poll_job(job_id):
    """Poll until job completes. Returns the result URL."""
    headers = {"Authorization": f"bearer {TOKEN}"}
    while True:
        resp = requests.get(f"{JOB_URL}/{job_id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        state = data["state"]

        if state == "pending":
            print("  Status: pending...")
        elif state == "running":
            progress = data.get("extractProgress", {})
            total = progress.get("totalPages", "?")
            extracted = progress.get("extractedPages", "?")
            print(f"  Status: running ({extracted}/{total} pages)")
        elif state == "done":
            progress = data["extractProgress"]
            print(f"  Done! Extracted {progress['extractedPages']} pages")
            return data["resultUrl"]["jsonUrl"]
        elif state == "failed":
            print(f"  FAILED: {data.get('errorMsg', 'unknown error')}")
            sys.exit(1)

        time.sleep(5)


def download_results(jsonl_url, output_dir, pdf_name):
    """Download and save markdown + images from results.

    Uses the PDF filename (e.g. '1-7') as prefix for output files.
    """
    resp = requests.get(jsonl_url)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    lines = resp.text.strip().split("\n")

    # Use PDF stem as prefix (e.g. "1-7" from "1-7.pdf")
    prefix = os.path.splitext(pdf_name)[0]

    scan_page = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
        result = json.loads(line)["result"]
        for res in result["layoutParsingResults"]:
            # Save markdown
            md_path = os.path.join(output_dir, f"pages_{prefix}_scan{scan_page}.md")
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(res["markdown"]["text"])
            print(f"  Saved: {md_path}")

            # Save embedded images
            for img_path, img_url in res["markdown"].get("images", {}).items():
                full_path = os.path.join(output_dir, img_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                img_bytes = requests.get(img_url).content
                with open(full_path, "wb") as f:
                    f.write(img_bytes)
                print(f"  Image: {full_path}")

            # Save output images (layout visualization etc.)
            for img_name, img_url in res.get("outputImages", {}).items():
                img_resp = requests.get(img_url)
                if img_resp.status_code == 200:
                    filename = os.path.join(output_dir, f"{img_name}_{prefix}_s{scan_page}.jpg")
                    with open(filename, "wb") as f:
                        f.write(img_resp.content)
                    print(f"  Layout image: {filename}")

            scan_page += 1


def main():
    import argparse
    parser = argparse.ArgumentParser(description="PaddleOCR Cloud API for 西安回族方言")
    parser.add_argument(
        "--input-dir",
        default=os.path.expanduser("~/Downloads/西安回族方言"),
        help="Source PDF folder",
    )
    parser.add_argument("--output-dir", default="./output_cloud", help="Output folder")
    parser.add_argument("--files", nargs="+", default=None,
                        help="PDF filenames to process (e.g. 1-7.pdf 8-19.pdf)")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    if args.files:
        pdf_files = [os.path.join(args.input_dir, f) for f in args.files]
    else:
        # Auto-detect all PDFs and sort by start page number
        import re
        all_pdfs = [f for f in os.listdir(args.input_dir) if f.endswith(".pdf")]
        def sort_key(name):
            match = re.match(r"(\d+)", name)
            return int(match.group(1)) if match else 999
        all_pdfs.sort(key=sort_key)
        pdf_files = [os.path.join(args.input_dir, name) for name in all_pdfs]

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"\n=== {filename} ===")
        print("Submitting to PaddleOCR cloud...")

        resp = submit_job(pdf_path)
        print(f"Response status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")
            continue

        job_id = resp.json()["data"]["jobId"]
        print(f"Job ID: {job_id}")

        jsonl_url = poll_job(job_id)
        download_results(jsonl_url, args.output_dir, filename)

    print(f"\nDone! All results saved to {args.output_dir}/")


if __name__ == "__main__":
    main()
