#!/usr/bin/env python3
"""Parse OCR markdown files into structured dictionary JSON."""

import json
import os
import re
import sys
from pathlib import Path

# File order matters - entries can span file boundaries
FILE_ORDER = [
    "pages_1-7_scan0.md",
    "pages_1-7_scan1.md",
    "pages_1-7_scan2.md",
    "pages_1-7_scan3.md",
    "pages_8-19_scan0.md",
    "pages_8-19_scan1.md",
    "pages_8-19_scan2.md",
    "pages_8-19_scan3.md",
    "pages_8-19_scan4.md",
    "pages_8-19_scan5.md",
]

ORIGIN_KEYWORDS = {
    "arabic": [r"阿拉伯语", r"阿语", r"阿拉伯"],
    "persian": [r"波斯语"],
    "mongolian": [r"蒙古语"],
    "turkic": [r"突厥语"],
    "uyghur": [r"维吾尔语"],
}


def clean_latex(text: str) -> str:
    """Clean LaTeX-style tonal notation."""
    # Remove $ wrappers: $ ^{21} $ -> ^{21}
    text = re.sub(r'\$\s*', '', text)
    # Convert ^{xx} to superscript unicode where possible
    superscript_map = {
        '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3',
        '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
        '8': '\u2078', '9': '\u2079', '-': '\u207b',
    }
    def replace_superscript(m):
        content = m.group(1)
        return ''.join(superscript_map.get(c, c) for c in content)
    text = re.sub(r'\^\{([0-9\-]+)\}', replace_superscript, text)
    # Also handle simple ^X
    text = re.sub(r'\^([0-9])', lambda m: superscript_map.get(m.group(1), m.group(1)), text)
    return text


def detect_origins(text: str) -> list[str]:
    """Detect origin languages from definition text."""
    origins = []
    for lang, patterns in ORIGIN_KEYWORDS.items():
        for pattern in patterns:
            if re.search(pattern, text):
                origins.append(lang)
                break
    return origins if origins else ["general"]


def parse_definitions(text: str) -> list[dict]:
    """Parse definition text into structured definitions with examples and notes."""
    definitions = []

    # Check for numbered sub-definitions ①②③
    numbered = re.split(r'[①②③④⑤⑥⑦⑧⑨⑩]', text)

    if len(numbered) > 1:
        # First part before ① is sometimes empty or a preamble
        parts = numbered[1:]  # skip the part before first number
    else:
        parts = [text]

    for part in parts:
        part = part.strip()
        if not part:
            continue

        meaning = ""
        examples = []
        notes = ""

        # Split by 注：for notes
        note_split = re.split(r'注：', part, maxsplit=1)
        main_part = note_split[0]
        if len(note_split) > 1:
            notes = note_split[1].strip()

        # Split by 例：for examples
        example_split = re.split(r'例：', main_part, maxsplit=1)
        meaning = example_split[0].strip()
        if len(example_split) > 1:
            example_text = example_split[0 + 1].strip()
            # Split examples by quoted sentences
            raw_examples = re.findall(r'"([^"]*)"', example_text)
            if not raw_examples:
                raw_examples = re.findall(r'"([^"]*)"', example_text)
            if not raw_examples:
                raw_examples = [example_text]
            examples = [e.strip() for e in raw_examples if e.strip()]

        definitions.append({
            "meaning": meaning,
            "examples": examples,
            "notes": notes,
        })

    # If no definitions were extracted, create one from the full text
    if not definitions:
        definitions.append({
            "meaning": text.strip(),
            "examples": [],
            "notes": "",
        })

    return definitions


def make_id(headword: str, pinyin: str, index: int) -> str:
    """Generate a URL-friendly ID."""
    # Use pinyin if available, otherwise use index
    slug = re.sub(r'[^\w\s]', '', pinyin.lower())
    slug = re.sub(r'\s+', '-', slug.strip())
    if not slug:
        slug = f"entry-{index}"
    return slug


def parse_entry(raw_text: str, section: str, index: int) -> dict | None:
    """Parse a single dictionary entry from raw text."""
    raw_text = raw_text.strip()
    if not raw_text:
        return None

    # Extract headword from 【...】
    head_match = re.match(r'【([^】]+)】', raw_text)
    if not head_match:
        return None

    full_headword = head_match.group(1)
    starred = '★' in full_headword
    headword = full_headword.replace('★', '').strip()

    remaining = raw_text[head_match.end():]

    # Extract pinyin - text before first （ or (
    pinyin = ""
    pinyin_match = re.match(r'([^（(【\[]+)', remaining)
    if pinyin_match:
        pinyin = pinyin_match.group(1).strip()

    # Extract tonal notation - content in （...） or (...)
    tonal = ""
    tonal_match = re.search(r'[（(]([^）)]+)[）)]', remaining)
    if tonal_match:
        tonal = clean_latex(tonal_match.group(1).strip())

    # Extract IPA - content in [...]
    ipa = ""
    ipa_match = re.search(r'\[([^\]]+)\]', remaining)
    if ipa_match:
        ipa = clean_latex(ipa_match.group(1).strip())

    # Get definition body - everything after the last ] bracket
    # Find the position after all pronunciation info
    def_start = 0
    # Find last ] that's part of IPA
    all_brackets = list(re.finditer(r'\]', remaining))
    if all_brackets:
        def_start = all_brackets[0].end()

    definition_text = remaining[def_start:].strip()
    # Clean up leading punctuation
    definition_text = re.sub(r'^[\s,，、]+', '', definition_text)

    # Detect origin languages
    origins = detect_origins(definition_text)
    if starred and origins == ["general"]:
        # Starred entries without detected language - check the full text
        origins = detect_origins(raw_text)

    # Parse structured definitions
    definitions = parse_definitions(definition_text)

    # Detect embedded images
    images = re.findall(r'src="([^"]+)"', raw_text)

    entry_id = make_id(headword, pinyin, index)

    return {
        "id": entry_id,
        "headword": headword,
        "starred": starred,
        "pinyin": pinyin,
        "tonalNotation": tonal,
        "ipa": ipa,
        "section": section,
        "originLanguages": origins,
        "definitions": definitions,
        "rawText": raw_text,
        "images": images,
    }


def extract_page_index(files_content: list[str]) -> dict[str, int]:
    """Extract headword → book page number mapping from HTML index tables in OCR files."""
    page_index = {}
    for content in files_content:
        for table_match in re.finditer(r'<table[^>]*>(.*?)</table>', content, re.DOTALL):
            table_html = table_match.group(1)
            for row in re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL):
                cells = re.findall(r'<td[^>]*>([^<]+)</td>', row)
                # Each row has pairs: [headword, page, headword, page, ...]
                for i in range(0, len(cells) - 1, 2):
                    headword = cells[i].strip().replace('★', '').strip()
                    page_str = cells[i + 1].strip()
                    if headword and page_str.isdigit():
                        page_index[headword] = int(page_str)
    return page_index


def main():
    input_dir = Path(__file__).parent.parent / "output_cloud"
    output_dir = Path(__file__).parent.parent / "website" / "public"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Read all files, tracking source boundaries
    file_segments = []  # (start_pos, end_pos, filename)
    full_text = ""
    files_content = []
    for filename in FILE_ORDER:
        filepath = input_dir / filename
        if not filepath.exists():
            print(f"Warning: {filepath} not found, skipping")
            continue
        content = filepath.read_text(encoding="utf-8")
        files_content.append(content)
        start = len(full_text)
        full_text += content + "\n"
        file_segments.append((start, len(full_text), filename))

    # Build headword → book page number index from HTML tables before stripping
    page_index = extract_page_index(files_content)
    print(f"Index table: found page numbers for {len(page_index)} headwords")

    def find_source(pos: int) -> dict:
        """Find which source file a position belongs to."""
        for start, end, filename in file_segments:
            if start <= pos < end:
                m = re.search(r'pages_(\d+-\d+)_scan(\d+)', filename)
                if m:
                    page_range = m.group(1)
                    scan_index = int(m.group(2))
                    # Derive PDF filename and 1-based page number within that PDF
                    # scan0 = page 1, scan1 = page 2, etc.
                    pdf_filename = f"{page_range}.pdf"
                    pdf_page = scan_index + 1
                    return {
                        "file": filename,
                        "pages": page_range,
                        "scan": scan_index,
                        "sourcePdf": pdf_filename,
                        "sourcePdfPage": pdf_page,
                    }
                return {"file": filename, "pages": "", "scan": 0, "sourcePdf": "", "sourcePdfPage": None}
        return {"file": "", "pages": "", "scan": 0, "sourcePdf": "", "sourcePdfPage": None}

    # Strip HTML table block from the beginning (index table)
    # Track the original positions before stripping
    table_free = re.sub(r'<table[^>]*>.*?</table>', '', full_text, flags=re.DOTALL)

    # Track current section
    current_section = "A"
    entries = []
    entry_index = 0

    # Split by section headers
    section_pattern = re.compile(r'^##\s+([A-Z])\s+部', re.MULTILINE)
    section_matches = list(section_pattern.finditer(table_free))

    if not section_matches:
        print("Warning: No section headers found")
        sections_with_text = [("A", table_free)]
    else:
        sections_with_text = []
        for i, match in enumerate(section_matches):
            section_letter = match.group(1)
            start = match.end()
            end = section_matches[i + 1].start() if i + 1 < len(section_matches) else len(table_free)
            sections_with_text.append((section_letter, table_free[start:end]))

    # Parse entries from each section
    for section_letter, section_text in sections_with_text:
        entry_chunks = re.split(r'(?=【)', section_text)

        for chunk in entry_chunks:
            chunk = chunk.strip()
            if not chunk or not chunk.startswith('【'):
                continue

            entry = parse_entry(chunk, section_letter, entry_index)
            if entry:
                # Find this entry in the original full_text to get source
                entry_pos = full_text.find(chunk[:40])
                src = find_source(entry_pos) if entry_pos >= 0 else {"file": "", "pages": "", "scan": 0}
                entry["sourceFile"] = src["file"]
                entry["sourcePages"] = src["pages"]
                entry["sourcePdf"] = src["sourcePdf"]
                entry["sourcePdfPage"] = src["sourcePdfPage"]
                # Also try index table lookup for book-level page number
                entry["sourcePage"] = page_index.get(entry["headword"])
                entries.append(entry)
                entry_index += 1

    # Deduplicate IDs
    seen_ids = {}
    for entry in entries:
        base_id = entry["id"]
        if base_id in seen_ids:
            seen_ids[base_id] += 1
            entry["id"] = f"{base_id}-{seen_ids[base_id]}"
        else:
            seen_ids[base_id] = 0

    # Build metadata
    sections = sorted(set(e["section"] for e in entries))
    origin_counts = {}
    for entry in entries:
        for origin in entry["originLanguages"]:
            origin_counts[origin] = origin_counts.get(origin, 0) + 1

    starred_count = sum(1 for e in entries if e["starred"])

    dictionary_data = {
        "metadata": {
            "title": "西安回族方言",
            "totalEntries": len(entries),
            "sections": sections,
            "originCounts": origin_counts,
            "starredCount": starred_count,
        },
        "entries": entries,
    }

    # Write JSON
    output_path = output_dir / "dictionary.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dictionary_data, f, ensure_ascii=False, indent=2)

    print(f"Parsed {len(entries)} entries across {len(sections)} sections")
    print(f"Sections: {', '.join(sections)}")
    print(f"Starred: {starred_count}")
    print(f"Origins: {origin_counts}")
    print(f"Output: {output_path}")

    # Copy images
    imgs_src = input_dir / "imgs"
    imgs_dst = output_dir / "imgs"
    if imgs_src.exists():
        imgs_dst.mkdir(parents=True, exist_ok=True)
        import shutil
        for img in imgs_src.iterdir():
            shutil.copy2(img, imgs_dst / img.name)
        print(f"Copied images to {imgs_dst}")


if __name__ == "__main__":
    main()
