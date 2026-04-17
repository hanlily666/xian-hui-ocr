import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "西安回族方言 — Linguistic Explorer",
  description: "Trace Silk Road word origins in the Xi'an Hui Muslim dialect",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, padding: 0, background: "#0D0B08" }}>
        {children}
      </body>
    </html>
  );
}
