"use client";

import { useEffect, useState } from "react";

export default function SourceViewer({ file }: { file: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const pageMatch = file?.match(/pages_(\d+-\d+)_scan(\d+)/);
  const pageRange = pageMatch ? pageMatch[1] : "";
  const scanNum = pageMatch ? parseInt(pageMatch[2]) : 0;

  useEffect(() => {
    if (!file) return;
    fetch(`/sources/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, [file]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">原始文档来源</h1>
          <p className="text-sm text-stone-500 mt-1">
            第 {pageRange} 页 &middot; 扫描 #{scanNum + 1}
          </p>
        </div>
        <a
          href="/browse"
          className="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
        >
          返回词典
        </a>
      </div>

      {error && (
        <div className="text-center py-12 text-stone-400">文档未找到</div>
      )}

      {content === null && !error && (
        <div className="text-center py-12 text-stone-400">加载中...</div>
      )}

      {content !== null && (
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <pre className="whitespace-pre-wrap text-sm text-stone-700 font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
