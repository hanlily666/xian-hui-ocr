"use client";

import { DictionaryEntry } from "@/lib/types";
import OriginBadge from "./OriginBadge";

interface EntryCardProps {
  entry: DictionaryEntry;
  expanded: boolean;
  onToggle: () => void;
}

export default function EntryCard({ entry, expanded, onToggle }: EntryCardProps) {
  const firstDef = entry.definitions[0];

  return (
    <div
      className="border border-stone-200 rounded-lg bg-white hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onToggle}
    >
      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-stone-900">
              {entry.headword}
              {entry.starred && <span className="text-amber-500 ml-1">&#9733;</span>}
            </h3>
            <span className="text-sm text-stone-500">{entry.pinyin}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {entry.originLanguages.map((o) => (
              <OriginBadge key={o} origin={o} />
            ))}
            {(entry.sourcePage || entry.sourcePages) && (
              <a
                href={entry.sourcePage ? `/view/${entry.sourcePage}` : `/sources/${entry.sourceFile}`}
                onClick={(e) => e.stopPropagation()}
                title={`来源：第 ${entry.sourcePage ?? entry.sourcePages} 页`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                p.{entry.sourcePage ?? entry.sourcePages}
              </a>
            )}
          </div>
        </div>

        {/* Brief definition */}
        <p className="text-sm text-stone-600 mt-1 line-clamp-2">
          {firstDef?.meaning}
        </p>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">
            {entry.ipa && (
              <div className="text-xs text-stone-400 font-mono">{entry.ipa}</div>
            )}

            {entry.definitions.map((def, i) => (
              <div key={i} className="space-y-1">
                {entry.definitions.length > 1 && (
                  <span className="text-xs font-bold text-stone-500">
                    {String.fromCodePoint(0x2460 + i)}{" "}
                  </span>
                )}
                <p className="text-sm text-stone-700">{def.meaning}</p>

                {def.examples.length > 0 && (
                  <div className="pl-3 border-l-2 border-stone-200 space-y-1">
                    {def.examples.map((ex, j) => (
                      <p key={j} className="text-sm text-stone-500 italic">
                        &ldquo;{ex}&rdquo;
                      </p>
                    ))}
                  </div>
                )}

                {def.notes && (
                  <p className="text-xs text-stone-400 mt-1">
                    <span className="font-medium">注：</span>
                    {def.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
