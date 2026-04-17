import { notFound } from "next/navigation";
import PdfViewer from "./PdfViewer";

export default async function ViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ pdf?: string; pdfPage?: string }>;
}) {
  const { page: pageLabel } = await params;
  const { pdf: pdfFile, pdfPage: pdfPageStr } = await searchParams;

  if (!pdfFile || !pdfPageStr) notFound();

  const pdfPage = parseInt(pdfPageStr, 10);
  const bucketUrl = process.env.PDF_BUCKET_URL;

  if (!bucketUrl) {
    return (
      <div style={{ color: "#E8DCC8", padding: 40, fontFamily: "sans-serif" }}>
        PDF_BUCKET_URL environment variable not set.
      </div>
    );
  }

  const pdfUrl = `${bucketUrl.replace(/\/$/, "")}/pdfs/${encodeURIComponent(pdfFile)}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0D0B08",
      color: "#E8DCC8",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        background: "#1A1510",
        borderBottom: "1px solid #3D3528",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <a href="/" style={{ color: "#8B7355", textDecoration: "none", fontSize: 13 }}>← Back</a>
        <span style={{ color: "#665840", fontSize: 13 }}>
          《西安回族方言》· {pdfFile}, page {pdfPage}
        </span>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: "auto", color: "#8B7355", fontSize: 12, textDecoration: "none" }}>
          Open PDF ↗
        </a>
      </div>
      <div style={{ flex: 1 }}>
        <PdfViewer pdfUrl={pdfUrl} pageNumber={pdfPage} />
      </div>
    </div>
  );
}
