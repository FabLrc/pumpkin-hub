"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePlugins } from "@/lib/hooks";
import type { SortField, SortOrder } from "@/lib/types";
import { ExplorerSidebar } from "./ExplorerSidebar";
import { ExplorerResults } from "./ExplorerResults";

export function ExplorerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") ?? "",
  );

  const page = Number(searchParams.get("page") ?? "1");
  const sortBy = (searchParams.get("sort_by") as SortField) ?? "downloads_total";
  const order = (searchParams.get("order") as SortOrder) ?? "desc";
  const category = searchParams.get("category") ?? undefined;

  const { data, isLoading } = usePlugins({
    page,
    per_page: 10,
    sort_by: sortBy,
    order,
    category,
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
      if (!("page" in updates)) {
        params.delete("page");
      }
      router.push(`/explorer?${params.toString()}`);
    },
    [searchParams, router],
  );

  function handleSortChange(newSortBy: SortField) {
    updateParams({ sort_by: newSortBy });
  }

  function handleCategoryChange(categorySlug: string | undefined) {
    updateParams({ category: categorySlug });
  }

  function handlePageChange(newPage: number) {
    updateParams({ page: String(newPage) });
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
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
      />
      <ExplorerResults
        plugins={data?.data ?? []}
        pagination={data?.pagination}
        isLoading={isLoading}
        currentPage={page}
        onPageChange={handlePageChange}
        activeCategory={category}
        sortBy={sortBy}
      />
    </div>
  );
}
