"use client";

import { Search, Shield, Coins, Map, Users, Gamepad2, Database, MessageSquare } from "lucide-react";
import type { SortField } from "@/lib/types";

// ── Category Definitions ──────────────────────────────────────────────────

const CATEGORIES = [
  { slug: "security", label: "Security", icon: Shield },
  { slug: "economy", label: "Economy", icon: Coins },
  { slug: "world-gen", label: "World Gen", icon: Map },
  { slug: "admin-tools", label: "Admin Tools", icon: Users },
  { slug: "gameplay", label: "Gameplay", icon: Gamepad2 },
  { slug: "storage", label: "Storage", icon: Database },
  { slug: "chat-social", label: "Chat / Social", icon: MessageSquare },
] as const;

// ── Sort Options ──────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "downloads_total", label: "Downloads ↓" },
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Updated" },
  { value: "name", label: "Name A–Z" },
];

// ── Props ─────────────────────────────────────────────────────────────────

interface ExplorerSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortField;
  onSortChange: (sort: SortField) => void;
  activeCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
}

export function ExplorerSidebar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  activeCategory,
  onCategoryChange,
}: ExplorerSidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border-default min-h-screen hidden md:block">
      <div className="sidebar-scroll p-5 space-y-8">
        {/* Search in sidebar */}
        <div>
          <div className="flex items-center gap-2 border border-border-default bg-bg-elevated px-3 py-2.5 focus-within:border-accent transition-colors">
            <Search className="text-text-dim flex-shrink-0 w-[14px] h-[14px]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter plugins..."
              className="search-input flex-1 bg-transparent font-mono text-xs text-text-primary placeholder-text-dim border-0 outline-none"
            />
          </div>
        </div>

        {/* Sort */}
        <div>
          <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-3">
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
          <div className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-3">
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

            {CATEGORIES.map(({ slug, label, icon: Icon }) => (
              <button
                key={slug}
                onClick={() => onCategoryChange(slug)}
                className={`w-full flex items-center justify-between font-mono text-xs border px-3 py-2 transition-colors cursor-pointer ${
                  activeCategory === slug
                    ? "text-accent border-accent/40 bg-accent/5"
                    : "text-text-dim border-border-default hover:border-border-hover"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-[11px] h-[11px]" />
                  <span>{label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        <button
          onClick={() => onCategoryChange(undefined)}
          className="w-full font-mono text-xs text-text-dim hover:text-accent border border-border-default hover:border-accent/30 px-3 py-2 transition-colors cursor-pointer"
        >
          Clear all filters
        </button>
      </div>
    </aside>
  );
}
