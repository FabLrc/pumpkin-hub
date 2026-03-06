"use client";

import { List, LayoutGrid } from "lucide-react";
import { PluginCard } from "@/components/ui";
import type { PluginSummary, PaginationMeta } from "@/lib/types";

interface ExplorerResultsProps {
  plugins: PluginSummary[];
  pagination: PaginationMeta | undefined;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  activeCategory: string | undefined;
  sortBy: string;
}

export function ExplorerResults({
  plugins,
  pagination,
  isLoading,
  currentPage,
  onPageChange,
}: ExplorerResultsProps) {
  const totalPlugins = pagination?.total ?? 0;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <main className="flex-1 min-w-0">
      {/* Results header bar */}
      <div className="border-b border-border-default px-6 py-3 flex items-center justify-between sticky top-14 bg-bg-base/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-dim">
            Showing{" "}
            <span className="text-text-primary">
              {totalPlugins.toLocaleString()}
            </span>{" "}
            plugins
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-dim">View:</span>
          <button
            className="border border-accent bg-accent/10 text-accent p-1.5"
            title="List view"
          >
            <List className="w-[14px] h-[14px]" />
          </button>
          <button
            className="border border-border-default text-text-dim hover:border-border-hover p-1.5 transition-colors"
            title="Grid view"
          >
            <LayoutGrid className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>

      {/* Plugin list */}
      <div className="p-6 space-y-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : plugins.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {plugins.map((plugin, index) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                featured={index === 0 && currentPage === 1}
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

function LoadingSkeleton() {
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
