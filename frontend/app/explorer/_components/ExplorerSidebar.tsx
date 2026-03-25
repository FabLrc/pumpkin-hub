"use client";

import { X } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import type { SearchSortOption, FacetDistribution } from "@/lib/types";
import { useCategories, usePumpkinVersions } from "@/lib/hooks";
import { PLATFORMS } from "@/lib/types";
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
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SearchSortOption;
  onSortChange: (sort: SearchSortOption) => void;
  activeCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
  activePlatform: string | undefined;
  onPlatformChange: (platform: string | undefined) => void;
  activePumpkinVersion: string | undefined;
  onPumpkinVersionChange: (version: string | undefined) => void;
  facets: FacetDistribution | null;
  onClearFilters: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ExplorerSidebar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  activeCategory,
  onCategoryChange,
  activePlatform,
  onPlatformChange,
  activePumpkinVersion,
  onPumpkinVersionChange,
  facets,
  onClearFilters,
  isMobileOpen = false,
  onMobileClose,
}: ExplorerSidebarProps) {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: pumpkinVersions } = usePumpkinVersions();

  const hasActiveFilters =
    activeCategory || activePlatform || activePumpkinVersion;

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
                !activeCategory
                  ? "text-accent border-accent/40 bg-accent/5"
                  : "text-text-subtle border-border-default hover:border-border-hover"
              }`}
            >
              <span>All</span>
            </button>

            {categoriesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
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

        {/* Platform Filter */}
        <div>
          <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
            Platform
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => onPlatformChange(undefined)}
              className={`w-full flex items-center justify-between font-mono text-xs border px-3 py-2 transition-colors cursor-pointer ${
                !activePlatform
                  ? "text-accent border-accent/40 bg-accent/5"
                  : "text-text-subtle border-border-default hover:border-border-hover"
              }`}
            >
              <span>All</span>
            </button>
            {PLATFORMS.map((platform) => {
              const count = facets?.platforms[platform];
              return (
                <button
                  key={platform}
                  onClick={() => onPlatformChange(platform)}
                  className={`w-full flex items-center justify-between font-mono text-xs border px-3 py-2 transition-colors cursor-pointer capitalize ${
                    activePlatform === platform
                      ? "text-accent border-accent/40 bg-accent/5"
                      : "text-text-dim border-border-default hover:border-border-hover"
                  }`}
                >
                  <span>{platform}</span>
                  {count !== undefined && (
                    <span className="text-text-dim text-[10px]">{count}</span>
                  )}
                </button>
              );
            })}
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
                  !activePumpkinVersion
                    ? "text-accent border-accent/40 bg-accent/5"
                    : "text-text-subtle border-border-default hover:border-border-hover"
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
