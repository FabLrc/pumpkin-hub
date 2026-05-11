"use client";

interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly showPageNumbers?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-6 border-t border-border-default">
      <span className="font-mono text-xs text-text-dim">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="page-btn font-mono text-xs border border-border-default text-text-dim px-3 py-1.5 hover:border-border-hover transition-colors disabled:opacity-30 cursor-pointer"
        >
          ←
        </button>
        {showPageNumbers && generatePageNumbers(currentPage, totalPages).map((pageNum) =>
          pageNum === "ellipsis-start" || pageNum === "ellipsis-end" ? (
            <span
              key={pageNum}
              className="font-mono text-xs text-text-dim px-1"
            >
              ···
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`page-btn font-mono text-xs border px-3 py-1.5 transition-colors cursor-pointer ${
                pageNum === currentPage
                  ? "active border-accent"
                  : "border-border-default text-text-subtle hover:border-border-hover"
              }`}
            >
              {pageNum}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="page-btn font-mono text-xs border border-border-default text-text-subtle px-3 py-1.5 hover:border-border-hover transition-colors disabled:opacity-30 cursor-pointer"
        >
          →
        </button>
      </div>
    </div>
  );
}

function generatePageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis-start" | "ellipsis-end")[] {
  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (currentPage > 3) pages.push("ellipsis-start");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (currentPage < totalPages - 2) pages.push("ellipsis-end");
  pages.push(totalPages);

  return pages;
}
