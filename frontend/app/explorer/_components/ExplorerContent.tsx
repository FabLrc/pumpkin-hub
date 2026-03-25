"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearch } from "@/lib/hooks";
import type { SearchSortOption } from "@/lib/types";
import { useViewPreference } from "@/lib/useViewPreference";
import { ExplorerSidebar } from "./ExplorerSidebar";
import { ExplorerResults } from "./ExplorerResults";
import { useEffect } from "react";

const DEFAULT_PER_PAGE = 10;

export function ExplorerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") ?? "",
  );
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const page = Number(searchParams.get("page") ?? "1");
  const sortBy = (searchParams.get("sort") as SearchSortOption) ?? "downloads";
  const category = searchParams.get("category") ?? undefined;
  const platform = searchParams.get("platform") ?? undefined;
  const pumpkinVersion = searchParams.get("pumpkin_version") ?? undefined;

  const activeFilterCount = [category, platform, pumpkinVersion].filter(Boolean).length;

  const { viewMode, setViewMode } = useViewPreference();

  // Prevent body scroll when mobile filter drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileFilterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileFilterOpen]);

  const { data, isLoading } = useSearch({
    q: searchQuery || undefined,
    category,
    platform,
    pumpkin_version: pumpkinVersion,
    sort: sortBy,
    page,
    per_page: DEFAULT_PER_PAGE,
  });

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset to page 1 on filter/sort change
      if (!("page" in updates)) {
        params.delete("page");
      }
      router.push(`/explorer?${params.toString()}`);
    },
    [searchParams, router],
  );

  function handleSortChange(newSort: SearchSortOption) {
    updateParams({ sort: newSort });
  }

  function handleCategoryChange(categorySlug: string | undefined) {
    updateParams({ category: categorySlug });
  }

  function handlePlatformChange(platformValue: string | undefined) {
    updateParams({ platform: platformValue });
  }

  function handlePumpkinVersionChange(version: string | undefined) {
    updateParams({ pumpkin_version: version });
  }

  function handlePageChange(newPage: number) {
    updateParams({ page: String(newPage) });
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    updateParams({ q: query || undefined });
  }

  function handleClearFilters() {
    setSearchQuery("");
    router.push("/explorer");
  }

  return (
    <div className="flex max-w-full">
      <ExplorerSidebar
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        activeCategory={category}
        onCategoryChange={handleCategoryChange}
        activePlatform={platform}
        onPlatformChange={handlePlatformChange}
        activePumpkinVersion={pumpkinVersion}
        onPumpkinVersionChange={handlePumpkinVersionChange}
        facets={data?.facet_distribution ?? null}
        onClearFilters={handleClearFilters}
        isMobileOpen={isMobileFilterOpen}
        onMobileClose={() => setIsMobileFilterOpen(false)}
      />
      <ExplorerResults
        hits={data?.hits ?? []}
        estimatedTotal={data?.estimated_total_hits ?? null}
        processingTimeMs={data?.processing_time_ms ?? null}
        isLoading={isLoading}
        currentPage={page}
        perPage={DEFAULT_PER_PAGE}
        onPageChange={handlePageChange}
        searchQuery={searchQuery}
        sortBy={sortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onMobileFilterOpen={() => setIsMobileFilterOpen(true)}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
