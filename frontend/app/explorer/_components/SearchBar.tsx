"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import useSWR from "swr";
import { getSuggestPath, swrFetcher } from "@/lib/api";
import type { SearchSuggestion } from "@/lib/types";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 6;

interface SearchBarProps {
  readonly value: string;
  readonly onChange: (query: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const [localValue, setLocalValue] = useState(value);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Debounce the query for suggestion fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(localValue.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localValue]);

  // Sync external value changes (e.g. URL param updates)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const shouldFetch = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const { data: suggestions, isLoading: suggestionsLoading } =
    useSWR<SearchSuggestion[]>(
      shouldFetch ? getSuggestPath(debouncedQuery, MAX_SUGGESTIONS) : null,
      swrFetcher,
      { revalidateOnFocus: false, dedupingInterval: 1000 },
    );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut to focus search
  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    document.addEventListener("keydown", handleGlobalKeydown);
    return () => document.removeEventListener("keydown", handleGlobalKeydown);
  }, []);

  const submitSearch = useCallback(
    (query: string) => {
      onChange(query);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const navigateToPlugin = useCallback(
    (slug: string) => {
      setIsOpen(false);
      router.push(`/plugins/${slug}`);
    },
    [router],
  );

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    setLocalValue(newValue);
    setActiveIndex(-1);
    if (newValue.trim().length >= MIN_QUERY_LENGTH) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const items = suggestions ?? [];

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev < items.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          navigateToPlugin(items[activeIndex].slug);
        } else {
          submitSearch(localValue.trim());
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const showDropdown =
    isOpen && (suggestionsLoading || (suggestions && suggestions.length > 0));

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-border-default bg-bg-elevated px-3 py-2.5 focus-within:border-accent transition-colors">
        {suggestionsLoading ? (
          <Loader2 className="text-accent flex-shrink-0 w-[14px] h-[14px] animate-spin" />
        ) : (
          <Search className="text-text-dim flex-shrink-0 w-[14px] h-[14px]" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (localValue.trim().length >= MIN_QUERY_LENGTH) setIsOpen(true);
          }}
          placeholder="Search plugins..."
          className="search-input flex-1 bg-transparent font-mono text-xs text-text-primary placeholder-text-dim border-0 outline-none"
          role="combobox"
          aria-expanded={showDropdown ? "true" : "false"}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
          }
        />
      </div>

      {showDropdown && (
        <ul
          ref={dropdownRef}
          id="search-suggestions"
          className="absolute z-50 top-full left-0 right-0 mt-px border border-border-default bg-bg-elevated shadow-lg list-none p-0 m-0"
        >
          {suggestionsLoading ? (
            <li className="px-3 py-3 font-mono text-xs text-text-dim">
              Searching…
            </li>
          ) : (
            suggestions?.map((suggestion: SearchSuggestion, index: number) => (
              <li key={suggestion.slug}>
                <button
                  id={`suggestion-${index}`}
                  onClick={() => navigateToPlugin(suggestion.slug)}
                  className={`w-full text-left px-3 py-2.5 font-mono text-xs transition-colors cursor-pointer ${
                    index === activeIndex
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-bg-surface"
                  }`}
                >
                  {suggestion.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
