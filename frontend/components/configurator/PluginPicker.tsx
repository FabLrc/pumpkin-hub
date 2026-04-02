"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { usePluginVersions, useSearch } from "@/lib/hooks";
import type { SearchHit } from "@/lib/types";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

interface PluginPickerProps {
  readonly onAdd: (
    plugin_id: string,
    version_id: string,
    plugin_name: string,
    version: string,
  ) => void;
  readonly excludedPluginIds?: string[];
}

interface SelectedPlugin {
  id: string;
  slug: string;
  name: string;
  author_username: string;
}

export function PluginPicker({
  onAdd,
  excludedPluginIds = [],
}: PluginPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<SelectedPlugin | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const shouldSearch = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const excludedSet = useMemo(
    () => new Set(excludedPluginIds),
    [excludedPluginIds],
  );

  const { data: searchData, isLoading: isSearchLoading } = useSearch({
    q: shouldSearch ? debouncedQuery : undefined,
    page: 1,
    per_page: MAX_RESULTS,
    sort: "relevance",
  });

  const hits = useMemo(() => {
    if (!shouldSearch) {
      return [];
    }

    return (searchData?.hits ?? [])
      .filter((hit) => !excludedSet.has(hit.id))
      .slice(0, MAX_RESULTS);
  }, [excludedSet, searchData?.hits, shouldSearch]);

  const { data: versionsData, isLoading: isVersionsLoading } = usePluginVersions(
    selectedPlugin?.slug ?? null,
  );

  const availableVersions = useMemo(
    () => (versionsData?.versions ?? []).filter((version) => !version.is_yanked),
    [versionsData?.versions],
  );

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setIsSearchOpen(true);
    setSelectedPlugin(null);
  }

  function handleSelectPlugin(hit: SearchHit) {
    setSelectedPlugin({
      id: hit.id,
      slug: hit.slug,
      name: hit.name,
      author_username: hit.author_username,
    });
    setIsSearchOpen(false);
  }

  function handleSelectVersion(versionId: string, versionName: string) {
    if (!selectedPlugin) {
      return;
    }

    onAdd(selectedPlugin.id, versionId, selectedPlugin.name, versionName);
    setQuery("");
    setDebouncedQuery("");
    setSelectedPlugin(null);
    setIsSearchOpen(false);
  }

  return (
    <div ref={rootRef} className="border border-border-default bg-bg-elevated">
      <div className="border-b border-border-default px-4 py-3">
        <label
          htmlFor="config-plugin-search"
          className="font-mono text-xs uppercase tracking-widest text-text-muted"
        >
          Rechercher un plugin
        </label>

        <div className="relative mt-3">
          <div className="flex items-center gap-2 border border-border-default bg-bg-base px-3 py-2 focus-within:border-accent transition-colors">
            {isSearchLoading && shouldSearch ? (
              <Loader2 className="w-3.5 h-3.5 text-accent animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-3.5 h-3.5 text-text-dim flex-shrink-0" />
            )}
            <input
              id="config-plugin-search"
              type="text"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Ex: economy, world, admin..."
              className="search-input w-full bg-transparent border-0 outline-none font-mono text-xs text-text-primary placeholder:text-text-dim"
            />
          </div>

          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-full mt-px z-20 border border-border-default bg-bg-elevated">
              {!shouldSearch ? (
                <div className="px-3 py-2.5 font-mono text-xs text-text-dim">
                  Tapez au moins 2 caracteres pour lancer la recherche.
                </div>
              ) : isSearchLoading ? (
                <div className="px-3 py-2.5 font-mono text-xs text-text-dim">
                  Recherche en cours...
                </div>
              ) : hits.length === 0 ? (
                <div className="px-3 py-2.5 font-mono text-xs text-text-dim">
                  Aucun plugin correspondant.
                </div>
              ) : (
                <ul className="list-none m-0 p-0 max-h-72 overflow-y-auto">
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectPlugin(hit)}
                        className="w-full text-left px-3 py-2.5 border-b border-border-default last:border-b-0 hover:bg-bg-surface transition-colors cursor-pointer"
                      >
                        <div className="font-raleway text-sm text-text-primary">
                          {hit.name}
                        </div>
                        <div className="font-mono text-[11px] text-text-dim uppercase tracking-wider">
                          by {hit.author_username}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedPlugin && (
        <div className="px-4 py-3 bg-accent/5 border-t border-accent/30">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                Plugin selectionne
              </p>
              <p className="font-raleway text-sm text-text-primary mt-1">
                {selectedPlugin.name}
              </p>
              <p className="font-mono text-[11px] text-text-dim uppercase tracking-wider">
                by {selectedPlugin.author_username}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlugin(null)}
              className="p-1 border border-border-default hover:border-border-hover text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
              aria-label="Fermer la selection de version"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-2">
            Choisir une version
          </p>

          <div className="border border-border-default bg-bg-base max-h-56 overflow-y-auto">
            {isVersionsLoading ? (
              <div className="px-3 py-2.5 font-mono text-xs text-text-dim">
                Chargement des versions...
              </div>
            ) : availableVersions.length === 0 ? (
              <div className="px-3 py-2.5 font-mono text-xs text-text-dim">
                Aucune version active disponible.
              </div>
            ) : (
              <ul className="list-none m-0 p-0">
                {availableVersions.map((version) => (
                  <li key={version.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectVersion(version.id, version.version)}
                      className="w-full text-left px-3 py-2.5 border-b border-border-default last:border-b-0 hover:bg-accent/10 hover:text-accent transition-colors font-mono text-xs text-text-secondary cursor-pointer"
                    >
                      v{version.version}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
