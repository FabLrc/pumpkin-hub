"use client";

import { Badge } from "@/components/ui";

interface ConfigPluginListItem {
  readonly plugin_id: string;
  readonly plugin_slug: string;
  readonly plugin_name: string;
  readonly version_id: string;
  readonly version: string;
  readonly is_auto_dep: boolean;
}

interface ConfigPluginListProps {
  readonly plugins: ConfigPluginListItem[];
  readonly onRemove: (plugin_id: string) => void;
}

export function ConfigPluginList({ plugins, onRemove }: ConfigPluginListProps) {
  return (
    <section className="border border-border-default bg-bg-elevated">
      <header className="px-4 py-3 border-b border-border-default">
        <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted">
          Plugins selectionnes
        </h3>
      </header>

      {plugins.length === 0 ? (
        <div className="px-4 py-6 font-mono text-xs text-text-dim">
          Aucun plugin dans cette configuration pour le moment.
        </div>
      ) : (
        <ul className="list-none m-0 p-0">
          {plugins.map((plugin) => (
            <li
              key={`${plugin.plugin_id}:${plugin.version_id}`}
              className="px-4 py-3 border-b border-border-default last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-raleway text-sm ${
                        plugin.is_auto_dep ? "text-text-muted" : "text-text-primary"
                      }`}
                    >
                      {plugin.plugin_name}
                    </span>
                    {plugin.is_auto_dep && <Badge variant="default">DEP</Badge>}
                  </div>

                  <div className="mt-1 font-mono text-[11px] text-text-dim uppercase tracking-wider flex flex-wrap gap-x-2 gap-y-1">
                    <span>v{plugin.version}</span>
                    <span aria-hidden="true">|</span>
                    <span>{plugin.plugin_slug}</span>
                  </div>
                </div>

                {plugin.is_auto_dep ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim mt-0.5">
                    Auto
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemove(plugin.plugin_id)}
                    className="w-7 h-7 border border-border-default hover:border-accent hover:text-accent text-text-secondary font-mono text-sm leading-none transition-colors cursor-pointer flex items-center justify-center"
                    aria-label={`Retirer ${plugin.plugin_name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="px-4 py-3 border-t border-border-default bg-bg-base">
        <p className="font-mono text-[11px] text-text-dim">
          Les plugins .wasm sont compatibles avec toutes les plateformes.
        </p>
      </footer>
    </section>
  );
}
