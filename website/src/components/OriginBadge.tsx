"use client";

import { ORIGIN_LABELS, ORIGIN_COLORS } from "@/lib/types";

export default function OriginBadge({ origin }: { origin: string }) {
  const label = ORIGIN_LABELS[origin] || origin;
  const colors = ORIGIN_COLORS[origin] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
