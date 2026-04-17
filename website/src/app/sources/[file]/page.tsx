import SourceViewer from "./SourceViewer";

export function generateStaticParams() {
  const files = [
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
  ];
  return files.map((file) => ({ file }));
}

export default async function SourcePage({
  params,
}: {
  params: Promise<{ file: string }>;
}) {
  const { file } = await params;
  return <SourceViewer file={file} />;
}
