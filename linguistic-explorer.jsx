import { useState, useRef, useEffect } from "react";

const EXAMPLE_WORDS = [
  { word: "戳刚", label: "戳刚 (leg)", desc: "Xi'an Hui dialect → Persian" },
  { word: "سلام", label: "سلام (peace)", desc: "Arabic → worldwide" },
  { word: "چای", label: "چای (tea)", desc: "Persian → global trade" },
  { word: "bazaar", label: "bazaar", desc: "Persian → dozens of languages" },
  { word: "算盘", label: "算盘 (abacus)", desc: "Chinese → Silk Road" },
  { word: "caravan", label: "caravan", desc: "Persian → European languages" },
];

const LANG_COLORS = {
  Persian: { bg: "#2D1B4E", fg: "#C9A0FF", border: "#7B4FBF" },
  Arabic: { bg: "#1B3D2F", fg: "#7EDCB5", border: "#3D9E78" },
  Turkish: { bg: "#3D1F1F", fg: "#F4A89A", border: "#B85C4F" },
  Chinese: { bg: "#3D2E1A", fg: "#F0C87A", border: "#B89044" },
  "Xi'an Hui": { bg: "#1A2E3D", fg: "#7AC0F0", border: "#4488B8" },
  Guanzhong: { bg: "#2E3D1A", fg: "#B8D97A", border: "#7A9E3D" },
  Urdu: { bg: "#3D1A2E", fg: "#F07AC0", border: "#B83D88" },
  Hindi: { bg: "#3D2A1A", fg: "#F0B07A", border: "#B87A3D" },
  Swahili: { bg: "#1A3D3D", fg: "#7AF0E0", border: "#3DB8A8" },
  Malay: { bg: "#2A1A3D", fg: "#B07AF0", border: "#7A3DB8" },
  Russian: { bg: "#1A1A3D", fg: "#7A7AF0", border: "#3D3DB8" },
  English: { bg: "#2D2D1B", fg: "#C9C9A0", border: "#8E8E5A" },
  French: { bg: "#1B2D3D", fg: "#A0C9F0", border: "#5A8EB8" },
  Spanish: { bg: "#3D1B2D", fg: "#F0A0C9", border: "#B85A8E" },
  Portuguese: { bg: "#2D3D1B", fg: "#C9F0A0", border: "#8EB85A" },
  default: { bg: "#2A2A2A", fg: "#CCCCCC", border: "#666666" },
};

function getColor(lang) {
  for (const [key, val] of Object.entries(LANG_COLORS)) {
    if (lang.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return LANG_COLORS.default;
}

function NetworkViz({ data }) {
  const svgRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  if (!data || !data.connections || data.connections.length === 0) return null;

  const cx = 340, cy = 260, radius = 190;
  const connections = data.connections;
  const angleStep = (2 * Math.PI) / connections.length;
  const startAngle = -Math.PI / 2;

  const nodes = connections.map((c, i) => {
    const angle = startAngle + i * angleStep;
    return {
      ...c,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      angle,
    };
  });

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 680 520"
      width="100%"
      style={{ display: "block" }}
    >
      {nodes.map((n, i) => {
        const isHov = hovered === i;
        const col = getColor(n.language);
        return (
          <line
            key={`line-${i}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke={col.border}
            strokeWidth={isHov ? 2.5 : 1.2}
            strokeDasharray={n.type === "cognate" ? "none" : "6 4"}
            opacity={hovered !== null && !isHov ? 0.2 : 0.7}
            style={{ transition: "all 0.3s" }}
          />
        );
      })}

      <circle cx={cx} cy={cy} r={52} fill="#1A1410" stroke="#8B7355" strokeWidth={2} />
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#F0DCC0"
        fontSize="17"
        fontWeight="600"
        fontFamily="'Noto Serif', Georgia, serif"
      >
        {data.input_word}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#A89070"
        fontSize="11"
        fontFamily="'Noto Sans', sans-serif"
      >
        {data.origin_language}
      </text>

      {nodes.map((n, i) => {
        const isHov = hovered === i;
        const col = getColor(n.language);
        const boxW = isHov ? 150 : 130;
        const boxH = isHov ? 72 : 60;
        const bx = n.x - boxW / 2;
        const by = n.y - boxH / 2;

        return (
          <g
            key={`node-${i}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={bx}
              y={by}
              width={boxW}
              height={boxH}
              rx={10}
              fill={col.bg}
              stroke={col.border}
              strokeWidth={isHov ? 2 : 1}
              opacity={hovered !== null && !isHov ? 0.35 : 1}
              style={{ transition: "all 0.3s" }}
            />
            <text
              x={n.x}
              y={n.y - (isHov ? 16 : 10)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={col.fg}
              fontSize={isHov ? "16" : "14"}
              fontWeight="600"
              fontFamily="'Noto Serif', Georgia, serif"
              style={{ transition: "font-size 0.3s" }}
            >
              {n.word_in_language}
            </text>
            <text
              x={n.x}
              y={n.y + (isHov ? 4 : 6)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={col.fg}
              fontSize="10"
              opacity={0.7}
              fontFamily="'Noto Sans', sans-serif"
            >
              {n.language}
              {n.pronunciation ? ` · ${n.pronunciation}` : ""}
            </text>
            {isHov && n.meaning && (
              <text
                x={n.x}
                y={n.y + 22}
                textAnchor="middle"
                dominantBaseline="central"
                fill={col.fg}
                fontSize="10"
                opacity={0.55}
                fontFamily="'Noto Sans', sans-serif"
              >
                {n.meaning.length > 25
                  ? n.meaning.slice(0, 25) + "…"
                  : n.meaning}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ConnectionCard({ conn }) {
  const col = getColor(conn.language);
  return (
    <div
      style={{
        background: col.bg,
        border: `1px solid ${col.border}`,
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          style={{
            color: col.fg,
            fontSize: 20,
            fontWeight: 600,
            fontFamily: "'Noto Serif', Georgia, serif",
          }}
        >
          {conn.word_in_language}
        </span>
        <span
          style={{
            color: col.fg,
            opacity: 0.5,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {conn.type || "loanword"}
        </span>
      </div>
      <div style={{ color: col.fg, opacity: 0.7, fontSize: 13 }}>
        <strong>{conn.language}</strong>
        {conn.pronunciation && (
          <span style={{ opacity: 0.6, marginLeft: 8 }}>{conn.pronunciation}</span>
        )}
      </div>
      {conn.meaning && (
        <div style={{ color: col.fg, opacity: 0.55, fontSize: 12 }}>{conn.meaning}</div>
      )}
      {conn.notes && (
        <div
          style={{
            color: col.fg,
            opacity: 0.45,
            fontSize: 11,
            fontStyle: "italic",
            marginTop: 2,
          }}
        >
          {conn.notes}
        </div>
      )}
    </div>
  );
}

export default function LinguisticExplorer() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function explore(word) {
    if (!word.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const systemPrompt = `You are a multilingual historical linguist and etymologist. Given a word in ANY language, trace its connections across languages — cognates, loanwords, borrowed forms, and phonetic relatives.

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

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Trace the linguistic connections of this word: "${word}"`,
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data.content
        ?.map((b) => (b.type === "text" ? b.text : ""))
        .join("");

      if (!text) throw new Error("No response from API");

      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (err) {
      console.error(err);
      setError("Could not analyze this word. Try another one.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e?.preventDefault?.();
    explore(query);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0D0B08 0%, #1A1510 40%, #0F1518 100%)",
        color: "#E8DCC8",
        fontFamily: "'Noto Sans', 'Helvetica Neue', sans-serif",
        padding: "0 0 60px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "#8B7355",
              marginBottom: 16,
            }}
          >
            Linguistic Connection Explorer
          </div>
          <h1
            style={{
              fontFamily: "'Noto Serif', Georgia, serif",
              fontSize: 36,
              fontWeight: 400,
              color: "#F0DCC0",
              margin: "0 0 12px",
              lineHeight: 1.2,
            }}
          >
            Where has this word been?
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#A89070",
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Type a word in any language. Watch it reveal its journey across
            civilizations, trade routes, and centuries.
          </p>
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Enter a word in any language…"
            style={{
              flex: 1,
              padding: "14px 20px",
              fontSize: 18,
              fontFamily: "'Noto Serif', Georgia, serif",
              background: "#1A1510",
              border: "1px solid #3D3528",
              borderRadius: 10,
              color: "#F0DCC0",
              outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            style={{
              padding: "14px 28px",
              fontSize: 14,
              fontWeight: 600,
              background: loading ? "#2A2418" : "#8B7355",
              color: loading ? "#665840" : "#0D0B08",
              border: "none",
              borderRadius: 10,
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Tracing…" : "Explore"}
          </button>
        </div>

        {/* Example chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 12, color: "#665840", lineHeight: "32px" }}>Try:</span>
          {EXAMPLE_WORDS.map((ex) => (
            <button
              key={ex.word}
              onClick={() => {
                setQuery(ex.word);
                explore(ex.word);
              }}
              disabled={loading}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                background: "transparent",
                border: "1px solid #3D3528",
                borderRadius: 20,
                color: "#A89070",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#8B7355";
                e.target.style.color = "#F0DCC0";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#3D3528";
                e.target.style.color = "#A89070";
              }}
              title={ex.desc}
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "2px solid #3D3528",
                borderTopColor: "#8B7355",
                borderRadius: "50%",
                margin: "0 auto 20px",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: "#8B7355", fontSize: 14, fontStyle: "italic" }}>
              Tracing linguistic connections across time and space…
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#B85C4F",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            {/* Origin card */}
            <div
              style={{
                background: "#1A1510",
                border: "1px solid #3D3528",
                borderRadius: 16,
                padding: "24px 28px",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
                <span
                  style={{
                    fontFamily: "'Noto Serif', Georgia, serif",
                    fontSize: 32,
                    color: "#F0DCC0",
                    fontWeight: 600,
                  }}
                >
                  {result.input_word}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "#8B7355",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {result.origin_language}
                </span>
              </div>
              {result.meaning && (
                <div style={{ fontSize: 15, color: "#A89070", marginBottom: 10 }}>
                  {result.meaning}
                </div>
              )}
              {result.historical_context && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#8B7355",
                    lineHeight: 1.7,
                    fontStyle: "italic",
                    borderLeft: "2px solid #3D3528",
                    paddingLeft: 16,
                    marginTop: 12,
                  }}
                >
                  {result.historical_context}
                </div>
              )}
            </div>

            {/* Network viz */}
            <div
              style={{
                background: "#0D0B08",
                border: "1px solid #3D3528",
                borderRadius: 16,
                padding: "16px 8px",
                marginBottom: 24,
              }}
            >
              <NetworkViz data={result} />
            </div>

            {/* Connection cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {result.connections?.map((conn, i) => (
                <ConnectionCard key={i} conn={conn} />
              ))}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: 24,
                justifyContent: "center",
                marginTop: 24,
                fontSize: 11,
                color: "#665840",
              }}
            >
              <span>
                <span style={{ display: "inline-block", width: 20, height: 2, background: "#8B7355", verticalAlign: "middle", marginRight: 6 }} />
                direct loanword
              </span>
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: 20,
                    height: 0,
                    borderTop: "2px dashed #8B7355",
                    verticalAlign: "middle",
                    marginRight: 6,
                  }}
                />
                cognate / phonetic relative
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
