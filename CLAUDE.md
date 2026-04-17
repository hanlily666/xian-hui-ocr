# 西安回族方言 — Project Context for Claude

## What this project is
Building an AI-powered dictionary and linguistic explorer for the book **《西安回族方言》** (Xi'an Hui Muslim Dialect). The goal is to let users explore which dialect words came from Arabic, Persian, Turkic, etc. — tracing the Silk Road and Islamic trade routes through language.

## Repository layout
```
xian-hui-ocr/
  ocr_cloud.py          # Cloud OCR pipeline (PaddleOCR VL-1.5 API)
  ocr_pipeline.py       # Local OCR pipeline (PaddleOCR, fallback)
  scripts/
    parse_dictionary.py # Parses OCR markdown → structured dictionary.json
  output_cloud/         # OCR results: pages_<range>_scan<n>.md
  website/              # Next.js app (static export)
    public/
      dictionary.json   # Parsed entries (148 so far, sections A & B)
      sources/          # OCR markdown files for source viewer
    src/app/
      page.tsx          # Homepage with stats + section/origin browsing
      browse/page.tsx   # Searchable/filterable entry list (Fuse.js)
      sources/[file]/   # Source document viewer
    src/components/
      EntryCard.tsx     # Entry card with source badge (clickable p.X-XX icon)
      OriginBadge.tsx   # Language origin colored badge
  linguistic-explorer.jsx  # Standalone Claude API word explorer component
```

## Scanned source documents
Located at: `~/Downloads/西安回族方言/`
- Named by page range: `1-7.pdf`, `8-19.pdf`, `20-29.pdf` ... `428-431.pdf`
- ~36 PDFs covering the full book
- **OCR'd so far**: `1-7.pdf` and `8-19.pdf` → 10 markdown files in `output_cloud/`

## OCR pipeline
- Uses **PaddleOCR Cloud API** (model: PaddleOCR-VL-1.5)
- Token stored as env var `PADDLEOCR_TOKEN` or hardcoded in `ocr_cloud.py`
- Run: `python3 ocr_cloud.py --files "1-7.pdf" "8-19.pdf"`
- Outputs: `output_cloud/pages_<range>_scan<n>.md`
- **Important**: must set `resp.encoding = "utf-8"` on the JSONL response or Chinese text becomes mojibake

## Parse pipeline
- Run: `python3 scripts/parse_dictionary.py`
- Reads all `output_cloud/pages_*.md` in `FILE_ORDER`
- Strips index tables, splits on `【】` entry markers, extracts: headword, pinyin, tonal notation, IPA, definitions, examples, notes, origin language, source file
- Outputs: `website/public/dictionary.json`
- Each entry has `sourceFile` and `sourcePages` fields for traceability

## Dictionary data structure
```json
{
  "metadata": { "totalEntries": 148, "sections": ["A","B"], "originCounts": {...} },
  "entries": [{
    "id": "...", "headword": "阿布", "starred": true,
    "pinyin": "ā bù", "tonalNotation": "...", "ipa": "...",
    "section": "A", "originLanguages": ["persian"],
    "definitions": [{ "meaning": "...", "examples": [...], "notes": "..." }],
    "sourceFile": "pages_1-7_scan1.md", "sourcePages": "1-7"
  }]
}
```

## Website (Next.js static export)
- Dev: `cd website && npx next dev`
- Build: `npx next build`
- Tailwind CSS v4, React 19, Fuse.js for fuzzy search
- Source badge on each entry: clicking opens `/sources/<file>` showing raw OCR

## The linguistic explorer
`linguistic-explorer.jsx` — standalone React component that calls Claude API directly from browser to trace word etymology across Silk Road languages. Outputs a network visualization (SVG) + connection cards.
- **Currently not integrated into the Next.js website** — next step is to add it as a `/explore` page
- Calls `claude-sonnet-4-20250514` with a structured JSON prompt
- Needs ANTHROPIC_API_KEY (should be moved to a backend API route, not called from browser)

## Key decisions made
- PaddleOCR cloud API vastly outperforms local PaddleOCR for this book (captures Arabic script, IPA, proper table structure)
- `resp.encoding = "utf-8"` fix is critical — without it Chinese chars are double-encoded
- Source file naming: `pages_<range>_scan<n>.md` to avoid collision across multiple PDFs
- PDFs must be processed in page-number order (not alphabetical) since scanner names them with `(1)` variants

## Next steps (planned)
1. OCR remaining ~34 PDFs and run parse script to grow the dictionary
2. Integrate `linguistic-explorer.jsx` into the website as `/explore` page
3. Move Claude API call to a Next.js API route (to hide the API key)
4. Feed actual dictionary entries as context to the Claude explorer
5. Add Claude-powered search (ask questions in natural language about origins)
