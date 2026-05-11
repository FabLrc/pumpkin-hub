"use client";

import { List, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { Pagination } from "@/components/ui";
import type { SearchHit } from "@/lib/types";
import type { ViewMode } from "@/lib/useViewPreference";
import { SearchHitCard } from "./SearchHitCard";

interface ExplorerResultsProps {
  readonly hits: SearchHit[];
  readonly estimatedTotal: number | null;
  readonly processingTimeMs: number | null;
  readonly isLoading: boolean;
  readonly error?: Error | undefined;
  readonly currentPage: number;
  readonly perPage: number;
  readonly onPageChange: (page: number) => void;
  readonly viewMode: ViewMode;
  readonly onViewModeChange: (mode: ViewMode) => void;
  readonly onMobileFilterOpen?: () => void;
  readonly activeFilterCount?: number;
}

export function ExplorerResults({
  hits,
  estimatedTotal,
  processingTimeMs,
  isLoading,
  error,
  currentPage,
  perPage,
  onPageChange,
  viewMode,
  onViewModeChange,
  onMobileFilterOpen,
  activeFilterCount = 0,
}: ExplorerResultsProps) {
  const totalHits = estimatedTotal ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalHits / perPage));

  function renderContent() {
    if (error) {
      return (
        <div className={viewMode === "grid" ? "col-span-full" : ""}>
          <ErrorState />
        </div>
      );
    }
    if (isLoading) {
      return <LoadingSkeleton viewMode={viewMode} />;
    }
    if (hits.length === 0) {
      return (
        <div className={viewMode === "grid" ? "col-span-full" : ""}>
          <EmptyState />
        </div>
      );
    }
    return (
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
    );
  }

  return (
    <main className="flex-1 min-w-0">
      {/* Results header bar */}
      <div className="border-b border-border-default px-6 py-3 flex items-center justify-between sticky top-14 bg-bg-base/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-4">
          {/* Mobile filter button */}
          {onMobileFilterOpen && (
            <button
              onClick={onMobileFilterOpen}
              className="md:hidden flex items-center gap-1.5 font-mono text-xs border border-border-default hover:border-border-hover text-text-dim px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-[13px] h-[13px]" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-accent text-black font-bold text-[10px] px-1.5 py-0.5 leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
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
          <span className="font-mono text-xs text-text-muted hidden sm:inline">View:</span>
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
        {renderContent()}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </main>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton({ viewMode }: { readonly viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <>
        {["sk-g1","sk-g2","sk-g3","sk-g4","sk-g5","sk-g6"].map((key) => (
          <div
            key={key}
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
      {["sk-l1","sk-l2","sk-l3","sk-l4","sk-l5"].map((key) => (
        <div
          key={key}
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

// ── Error State ────────────────────────────────────────────────────────────

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-border-default bg-bg-elevated/30">
      <div className="w-16 h-16 border border-border-default bg-bg-surface flex items-center justify-center mb-6">
        <span className="font-mono text-2xl text-error">!</span>
      </div>
      <h3 className="font-raleway font-bold text-lg text-text-primary mb-2">
        Search failed
      </h3>
      <p className="font-mono text-xs text-text-dim max-w-sm text-center">
        Could not load search results. Please check your connection and try
        again.
      </p>
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
