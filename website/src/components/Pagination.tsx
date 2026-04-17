"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded text-sm border border-stone-300 disabled:opacity-30 hover:bg-stone-100"
      >
        上一页
      </button>
      {pages.map((p, i) =>
        typeof p === "number" ? (
          <button
            key={i}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 rounded text-sm border ${
              p === currentPage
                ? "bg-stone-800 text-white border-stone-800"
                : "border-stone-300 hover:bg-stone-100"
            }`}
          >
            {p}
          </button>
        ) : (
          <span key={i} className="px-2 text-stone-400">...</span>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded text-sm border border-stone-300 disabled:opacity-30 hover:bg-stone-100"
      >
        下一页
      </button>
    </div>
  );
}
