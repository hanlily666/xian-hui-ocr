# 西安回族方言 — Linguistic Explorer

An AI-powered dictionary and etymology explorer for **《西安回族方言》** (Xi'an Hui Muslim Dialect), a scholarly dictionary documenting the Arabic, Persian, Turkic, and Mongolian loanwords preserved in the dialect spoken by the Hui Muslim community of Xi'an, China.

The project traces how words traveled the Silk Road and through Islamic scholarship, from Mecca to Central Asia to the alleys of the Xi'an Muslim Quarter.

---

## Features

- **Browse dictionary** — 148 entries (sections A–B) with origin language tags, pinyin, IPA, definitions, and usage examples
- **Source viewer** — every entry links back to the original OCR'd page scan from the book
- **Linguistic explorer** — type any word in any language and get an AI-generated map of its cognates, loanwords, and phonetic relatives across Silk Road languages
- **Semantic search** — OpenAI embeddings + cosine similarity surface relevant dictionary entries as RAG context for the explorer
- **Caching** — Upstash Redis caches explorer results for 7 days

---

## Stack

| Layer | Tech |
|---|---|
| OCR | PaddleOCR VL-1.5 (cloud API) |
| Parsing | Python (`scripts/parse_dictionary.py`) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Vector search | In-memory cosine similarity (flat JSON) |
| LLM | Claude Haiku (`claude-haiku-4-5`) |
| Cache | Upstash Redis |
| Frontend | Next.js 15, Tailwind CSS v4, React 19 |
| Search | Fuse.js (fuzzy) |
| Deploy | Vercel |

---

## Repository layout

```
xian-hui-ocr/
  ocr_cloud.py              # Cloud OCR pipeline (PaddleOCR VL-1.5 API)
  ocr_pipeline.py           # Local OCR pipeline (fallback)
  scripts/
    parse_dictionary.py     # OCR markdown → structured dictionary.json
    generate_embeddings.py  # dictionary.json → embeddings.json (OpenAI)
    build_page_map.py       # Builds source page map for PDF viewer
    upload_pdfs_to_s3.py    # Uploads scanned PDFs to S3
  output_cloud/             # OCR results: pages_<range>_scan<n>.md
  website/
    public/
      dictionary.json       # Parsed entries
      embeddings.json       # OpenAI embeddings (one per entry)
      sources/              # OCR markdown files for source viewer
    src/app/
      page.tsx              # Homepage — stats + section/origin browsing
      browse/page.tsx       # Searchable/filterable entry list
      sources/[file]/       # Raw OCR source viewer
      api/explore/route.ts  # Explorer API: embed → RAG → Claude → cache
    src/components/
      EntryCard.tsx         # Entry card with source badge
      OriginBadge.tsx       # Language origin colored badge
```

---

## Data pipeline

```
PDF scans
  └─▶ ocr_cloud.py  (PaddleOCR VL-1.5)
        └─▶ output_cloud/*.md
              └─▶ scripts/parse_dictionary.py
                    └─▶ website/public/dictionary.json
                          └─▶ scripts/generate_embeddings.py
                                └─▶ website/public/embeddings.json
```

### OCR

```bash
export PADDLEOCR_TOKEN=your_token
python3 ocr_cloud.py --files "8-19.pdf" "20-29.pdf"
```

Outputs `output_cloud/pages_<range>_scan<n>.md`. The PaddleOCR cloud model handles Arabic script, IPA, and mixed Chinese/Latin text far better than local models.

### Parsing

```bash
python3 scripts/parse_dictionary.py
```

Reads all `output_cloud/pages_*.md` in page order. Extracts headword, pinyin, tonal notation, IPA, definitions, examples, notes, and origin language tag from `【】`-delimited entries.

### Embeddings

```bash
export OPENAI_API_KEY=your_key
python3 scripts/generate_embeddings.py
```

Embeds each entry's headword + definitions with `text-embedding-3-small`. Outputs `website/public/embeddings.json`.

---

## Running locally

```bash
cd website
cp .env.example .env.local   # add ANTHROPIC_API_KEY, OPENAI_API_KEY, UPSTASH_*
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Dictionary coverage

| Section | Entries | Status |
|---|---|---|
| A | ~80 | ✅ OCR'd |
| B | ~68 | ✅ OCR'd |
| C–Z | ~280+ | ⏳ pending |

Origin breakdown (current): Arabic 27, Persian 15, Turkic 1, Uyghur 1, Mongolian 1, general 110.

---

## Background

《西安回族方言》 documents the living lexicon of the Hui community in Xi'an's Muslim Quarter — a neighborhood that has been continuously inhabited by Muslim merchants and their descendants since the Tang dynasty. Many words in daily use among Xi'an's Hui community are loanwords from Arabic (Islamic religious vocabulary), Persian (Silk Road trade), and Turkic and Mongolian languages (Yuan and Ming dynasty contact). This project makes that linguistic history searchable and explorable.

---

## License

Dictionary content © original authors. Code MIT.
