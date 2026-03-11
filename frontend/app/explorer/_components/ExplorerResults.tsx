"use client";

import { List, LayoutGrid } from "lucide-react";
import type { SearchHit, SearchSortOption } from "@/lib/types";
import type { ViewMode } from "@/lib/useViewPreference";
import { SearchHitCard } from "./SearchHitCard";

interface ExplorerResultsProps {
  hits: SearchHit[];
  estimatedTotal: number | null;
  processingTimeMs: number | null;
  isLoading: boolean;
  currentPage: number;
  perPage: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  sortBy: SearchSortOption;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ExplorerResults({
  hits,
  estimatedTotal,
  processingTimeMs,
  isLoading,
  currentPage,
  perPage,
  onPageChange,
  viewMode,
  onViewModeChange,
}: ExplorerResultsProps) {
  const totalHits = estimatedTotal ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalHits / perPage));

  return (
    <main className="flex-1 min-w-0">
      {/* Results header bar */}
      <div className="border-b border-border-default px-6 py-3 flex items-center justify-between sticky top-14 bg-bg-base/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-dim">
            Showing{" "}
            <span className="text-text-primary">
              {totalHits.toLocaleString()}
            </span>{" "}
            plugins
            {processingTimeMs !== null && (
              <span className="ml-2 text-text-dim">
                in {processingTimeMs}ms
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-dim">View:</span>
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-1.5 border transition-colors cursor-pointer ${
              viewMode === "list"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-default text-text-dim hover:border-border-hover"
            }`}
            title="List view"
            aria-label={viewMode === "list" ? "List view (active)" : "Switch to list view"}
          >
            <List className="w-[14px] h-[14px]" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={`p-1.5 border transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-default text-text-dim hover:border-border-hover"
            }`}
            title="Grid view"
            aria-label={viewMode === "grid" ? "Grid view (active)" : "Switch to grid view"}
          >
            <LayoutGrid className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>

      {/* Plugin list / grid */}
      <div className={viewMode === "grid"
        ? "p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        : "p-6 space-y-3"
      }>
        {isLoading ? (
          <LoadingSkeleton viewMode={viewMode} />
        ) : hits.length === 0 ? (
          <div className={viewMode === "grid" ? "col-span-full" : ""}>
            <EmptyState />
          </div>
        ) : (
          <>
            {hits.map((hit, index) => (
              <SearchHitCard
                key={hit.id}
                hit={hit}
                featured={index === 0 && currentPage === 1}
                viewMode={viewMode}
              />
            ))}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </main>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  function generatePageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);

    return pages;
  }

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
        {generatePageNumbers().map((pageNum, index) =>
          pageNum === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
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

// ── Loading Skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="border border-border-default bg-bg-elevated/30 p-5 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-bg-surface flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-bg-surface w-32" />
                <div className="h-3 bg-bg-surface w-20" />
              </div>
            </div>
            <div className="h-3 bg-bg-surface w-full mb-2" />
            <div className="h-3 bg-bg-surface w-2/3 mb-4" />
            <div className="flex gap-2">
              <div className="h-4 bg-bg-surface w-14" />
              <div className="h-4 bg-bg-surface w-14" />
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="border border-border-default bg-bg-elevated/30 p-5 flex items-start gap-5 animate-pulse"
        >
          <div className="w-11 h-11 bg-bg-surface flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-bg-surface w-48" />
            <div className="h-3 bg-bg-surface w-32" />
            <div className="h-3 bg-bg-surface w-full max-w-md" />
            <div className="flex gap-2">
              <div className="h-4 bg-bg-surface w-16" />
              <div className="h-4 bg-bg-surface w-16" />
            </div>
          </div>
          <div className="space-y-2 min-w-[100px]">
            <div className="h-4 bg-bg-surface w-16 ml-auto" />
            <div className="h-3 bg-bg-surface w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-border-default bg-bg-elevated/30">
      <div className="w-16 h-16 border border-border-default bg-bg-surface flex items-center justify-center mb-6">
        <span className="font-mono text-2xl text-text-dim">?</span>
      </div>
      <h3 className="font-raleway font-bold text-lg text-text-primary mb-2">
        No plugins found
      </h3>
      <p className="font-mono text-xs text-text-dim max-w-sm text-center">
        Try adjusting your filters or search query. New plugins are published
        every day!
      </p>
    </div>
  );
}
