"use client";

import { useState } from "react";

export default function PdfViewer({
  pdfUrl,
  pageNumber,
}: {
  pdfUrl: string;
  pageNumber: number;
}) {
  const [iframeError, setIframeError] = useState(false);
  const iframeSrc = `${pdfUrl}#page=${pageNumber}`;

  if (iframeError) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
        gap: 16,
        color: "#A89070",
        fontFamily: "sans-serif",
      }}>
        <div style={{ fontSize: 14 }}>Your browser cannot display this PDF inline.</div>
        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "10px 24px",
            background: "#8B7355",
            color: "#0D0B08",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Open PDF at page {pageNumber} ↗
        </a>
      </div>
    );
  }

  return (
    <iframe
      src={iframeSrc}
      style={{ width: "100%", height: "calc(100vh - 53px)", border: "none" }}
      title={`PDF page ${pageNumber}`}
      onError={() => setIframeError(true)}
    />
  );
}
