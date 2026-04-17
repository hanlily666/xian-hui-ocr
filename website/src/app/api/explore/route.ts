import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Redis } from "@upstash/redis";
import { readFileSync } from "fs";
import { join } from "path";

// Lazy-initialized clients (avoid build-time initialization errors)
let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;
let _redis: Redis | null = null;

function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
function getRedis() {
  if (!_redis && process.env.UPSTASH_REDIS_REST_URL) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

type DictionaryEntry = {
  id: string;
  headword: string;
  pinyin: string;
  originLanguages: string[];
  definitions: { meaning: string; examples: string[]; notes: string }[];
  sourcePdf?: string;
  sourcePdfPage?: number;
  sourcePage?: number;
};

type EmbeddingRecord = { id: string; embedding: number[] };

// Module-level caches (persist across requests within the same serverless instance)
let dictEntries: DictionaryEntry[] | null = null;
let embeddings: EmbeddingRecord[] | null = null;
let embeddingIndex: Map<string, number[]> | null = null;

function loadDictionary(): DictionaryEntry[] {
  if (!dictEntries) {
    const path = join(process.cwd(), "public", "dictionary.json");
    const data = JSON.parse(readFileSync(path, "utf-8"));
    dictEntries = data.entries;
  }
  return dictEntries!;
}

function loadEmbeddings(): Map<string, number[]> {
  if (!embeddingIndex) {
    const path = join(process.cwd(), "public", "embeddings.json");
    embeddings = JSON.parse(readFileSync(path, "utf-8")) as EmbeddingRecord[];
    embeddingIndex = new Map(embeddings.map((e) => [e.id, e.embedding]));
  }
  return embeddingIndex!;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getTopEntries(queryEmbedding: number[], topK = 5): Promise<DictionaryEntry[]> {
  const entries = loadDictionary();
  const index = loadEmbeddings();

  const scores = entries
    .map((entry) => {
      const emb = index.get(entry.id);
      if (!emb) return { entry, score: 0 };
      return { entry, score: cosineSimilarity(queryEmbedding, emb) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scores.map((s) => s.entry);
}

const SYSTEM_PROMPT = `You are a multilingual historical linguist and etymologist specializing in Silk Road language exchange. Given a word in ANY language, trace its connections across languages — cognates, loanwords, borrowed forms, and phonetic relatives.

You will receive relevant dictionary entries from 《西安回族方言》(Xi'an Hui Muslim Dialect dictionary) as context. Use them when they are relevant to the word being explored.

Return ONLY valid JSON (no markdown, no backticks, no preamble) with this structure:
{
  "input_word": "the word as entered",
  "origin_language": "the most likely origin language",
  "meaning": "meaning in English",
  "historical_context": "1-2 sentences about how this word traveled (Silk Road, Islamic scholarship, trade, colonialism, etc.)",
  "connections": [
    {
      "language": "Language Name",
      "word_in_language": "the word in that language (use native script when possible)",
      "pronunciation": "approximate pronunciation",
      "meaning": "meaning in that language (brief)",
      "type": "cognate | loanword | phonetic_relative | semantic_shift",
      "notes": "brief note on how it got there or how it changed"
    }
  ]
}

Find 5-8 connections across diverse language families. Prioritize:
- Languages along the Silk Road (Persian, Arabic, Turkic, Chinese dialects, Urdu, Hindi)
- Languages showing interesting semantic shifts
- Languages where the word is still in active daily use
- Include Chinese dialect variants when relevant (Guanzhong/关中话, Xi'an Hui/回族方言, Dungan)

Be specific about pronunciation. Use IPA or close approximations. Include native scripts.`;

export async function POST(req: NextRequest) {
  const { word } = await req.json();
  if (!word?.trim()) {
    return NextResponse.json({ error: "Missing word" }, { status: 400 });
  }

  const cacheKey = `explore:${word.trim().toLowerCase()}`;

  const redis = getRedis();

  // Check Redis cache
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  // Embed the query word
  const embResponse = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: word.trim(),
  });
  const queryEmbedding = embResponse.data[0].embedding;

  // Find top relevant dictionary entries
  let contextBlock = "";
  try {
    const topEntries = await getTopEntries(queryEmbedding);
    if (topEntries.length > 0) {
      const entryTexts = topEntries.map((e) => {
        const defs = e.definitions.map((d) => d.meaning).join("; ");
        const origins = e.originLanguages.join(", ");
        return `${e.headword} (${e.pinyin}) [${origins}]: ${defs}`;
      });
      contextBlock = `\n\nRelevant entries from 《西安回族方言》:\n${entryTexts.join("\n")}`;
    }
  } catch {
    // embeddings.json may not exist yet — skip context gracefully
  }

  // Call Claude haiku
  const message = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: SYSTEM_PROMPT + contextBlock,
    messages: [
      { role: "user", content: `Trace the linguistic connections of this word: "${word}"` },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  const result = JSON.parse(cleaned);

  // Enrich with source PDF info from dictionary
  try {
    const entries = loadDictionary();
    const headwordMap = new Map(entries.map((e) => [e.headword, e]));

    // Check if the searched word itself is in the dictionary
    const inputMatch = headwordMap.get(word.trim());
    if (inputMatch?.sourcePdf && inputMatch?.sourcePdfPage) {
      result.sourcePdf = inputMatch.sourcePdf;
      result.sourcePdfPage = inputMatch.sourcePdfPage;
    }

    // Enrich connection cards
    if (result.connections) {
      result.connections = result.connections.map(
        (conn: { word_in_language: string; sourcePdf?: string; sourcePdfPage?: number }) => {
          const match = headwordMap.get(conn.word_in_language);
          if (match?.sourcePdf && match?.sourcePdfPage) {
            return { ...conn, sourcePdf: match.sourcePdf, sourcePdfPage: match.sourcePdfPage };
          }
          return conn;
        }
      );
    }
  } catch {
    // dictionary not loaded — skip enrichment
  }

  // Cache result for 7 days
  if (redis) {
    await getRedis()!.set(cacheKey, result, { ex: 604800 });
  }

  return NextResponse.json(result);
}
