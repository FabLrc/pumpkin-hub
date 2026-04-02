"use client";

import { X } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import type { SearchSortOption, FacetDistribution } from "@/lib/types";
import { useCategories, usePumpkinVersions } from "@/lib/hooks";
import { SearchBar } from "./SearchBar";

// ── Sort Options ──────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SearchSortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "downloads", label: "Downloads ↓" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Updated" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
];

// ── Props ─────────────────────────────────────────────────────────────────

interface ExplorerSidebarProps {
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
  readonly sortBy: SearchSortOption;
  readonly onSortChange: (sort: SearchSortOption) => void;
  readonly activeCategory: string | undefined;
  readonly onCategoryChange: (category: string | undefined) => void;
  readonly activePumpkinVersion: string | undefined;
  readonly onPumpkinVersionChange: (version: string | undefined) => void;
  readonly facets: FacetDistribution | null;
  readonly onClearFilters: () => void;
  readonly isMobileOpen?: boolean;
  readonly onMobileClose?: () => void;
}

export function ExplorerSidebar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  activeCategory,
  onCategoryChange,
  activePumpkinVersion,
  onPumpkinVersionChange,
  facets,
  onClearFilters,
  isMobileOpen = false,
  onMobileClose,
}: ExplorerSidebarProps) {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: pumpkinVersions } = usePumpkinVersions();

  const hasActiveFilters = activeCategory || activePumpkinVersion;

  const sidebarContent = (
    <div className="p-5 space-y-8">
      {/* Mobile close button */}
      {onMobileClose && (
        <div className="flex items-center justify-between md:hidden">
          <span className="font-mono text-xs text-text-dim uppercase tracking-widest">Filters</span>
          <button
            onClick={onMobileClose}
            className="p-1 border border-border-default hover:border-border-hover transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-4 h-4 text-text-dim" />
          </button>
        </div>
      )}

      {/* Search with autocomplete */}
      <SearchBar value={searchQuery} onChange={onSearchChange} />

      {/* Sort */}
      <div>
        <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
          Sort By
        </div>
        <div className="space-y-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={`sort-btn w-full text-left font-mono text-xs px-3 py-2 border transition-colors cursor-pointer ${
                sortBy === option.value
                  ? "active border-accent"
                  : "border-transparent text-text-dim hover:border-border-default"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
          Category
        </div>
        <div className="space-y-1.5">
          {/* All */}
          <button
            onClick={() => onCategoryChange(undefined)}
            className={`w-full flex items-center justify-between font-mono text-xs border px-3 py-2 transition-colors cursor-pointer ${
              activeCategory
                ? "text-text-subtle border-border-default hover:border-border-hover"
                : "text-accent border-accent/40 bg-accent/5"
            }`}
          >
            <span>All</span>
          </button>

          {categoriesLoading ? (
            ["sk-1","sk-2","sk-3","sk-4"].map((key) => (
              <div
                key={key}
                className="h-8 bg-bg-surface border border-border-default animate-pulse"
              />
            ))
          ) : (
            categories?.map((cat: { slug: string; name: string; icon: string | null }) => {
              const Icon = getCategoryIcon(cat.icon);
              const count = facets?.categories[cat.slug];
              return (
                <button
                  key={cat.slug}
                  onClick={() => onCategoryChange(cat.slug)}
                  className={`w-full flex items-center justify-between font-mono text-xs border px-3 py-2 transition-colors cursor-pointer ${
                    activeCategory === cat.slug
                      ? "text-accent border-accent/40 bg-accent/5"
                      : "text-text-dim border-border-default hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-[11px] h-[11px]" />
                    <span>{cat.name}</span>
                  </div>
                  {count !== undefined && (
                    <span className="text-text-dim text-[10px]">{count}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Pumpkin Version Filter */}
      {pumpkinVersions && pumpkinVersions.length > 0 && (
        <div>
          <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
            Pumpkin Version
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <button
              onClick={() => onPumpkinVersionChange(undefined)}
              className={`w-full flex items-center justify-between font-mono text-xs border px-3 py-2 transition-colors cursor-pointer ${
                activePumpkinVersion
                  ? "text-text-subtle border-border-default hover:border-border-hover"
                  : "text-accent border-accent/40 bg-accent/5"
              }`}
            >
              <span>All</span>
            </button>
            {pumpkinVersions.map((ver: { version: string }) => {
              const count = facets?.pumpkin_versions[ver.version];
              return (
                <button
                  key={ver.version}
                  onClick={() => onPumpkinVersionChange(ver.version)}
                  className={`w-full flex items-center justify-between font-mono text-xs border px-3 py-2 transition-colors cursor-pointer ${
                    activePumpkinVersion === ver.version
                      ? "text-accent border-accent/40 bg-accent/5"
                      : "text-text-dim border-border-default hover:border-border-hover"
                  }`}
                >
                  <span>{ver.version}</span>
                  {count !== undefined && (
                    <span className="text-text-dim text-[10px]">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="w-full font-mono text-xs text-text-dim hover:text-accent border border-border-default hover:border-accent/30 px-3 py-2 transition-colors cursor-pointer"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border-default min-h-screen hidden md:block">
        <div className="sidebar-scroll">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile filter drawer */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-bg-base border-r border-border-default z-50 md:hidden overflow-y-auto">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
