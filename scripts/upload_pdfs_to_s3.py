#!/usr/bin/env python3
"""Upload all PDFs from ~/Downloads/西安回族方言/ to an S3 bucket.

Run once (and again whenever new PDFs are added).
Requires: pip install boto3
Requires env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
"""

import os
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

PDF_DIR = Path.home() / "Downloads" / "西安回族方言"


def main():
    bucket = os.environ.get("S3_BUCKET_NAME")
    region = os.environ.get("AWS_REGION", "us-east-1")
    if not bucket:
        print("Error: S3_BUCKET_NAME not set")
        return

    s3 = boto3.client("s3", region_name=region)

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {PDF_DIR}")
        return

    print(f"Uploading {len(pdfs)} PDFs to s3://{bucket}/pdfs/ ...")
    uploaded = 0
    skipped = 0

    for pdf in pdfs:
        key = f"pdfs/{pdf.name}"
        # Check if already uploaded (skip if exists)
        try:
            s3.head_object(Bucket=bucket, Key=key)
            print(f"  Skip (exists): {pdf.name}")
            skipped += 1
            continue
        except ClientError as e:
            if e.response["Error"]["Code"] != "404":
                raise

        print(f"  Uploading: {pdf.name} ({pdf.stat().st_size // 1024} KB)...")
        s3.upload_file(
            str(pdf),
            bucket,
            key,
            ExtraArgs={"ContentType": "application/pdf"},
        )
        uploaded += 1

    print(f"\nDone: {uploaded} uploaded, {skipped} skipped")
    print(f"PDFs accessible at: https://{bucket}.s3.{region}.amazonaws.com/pdfs/<filename>")
    print(f"Set env var: PDF_BUCKET_URL=https://{bucket}.s3.{region}.amazonaws.com")


if __name__ == "__main__":
    main()
