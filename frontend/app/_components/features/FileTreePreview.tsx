import { PreviewFrame } from "./PreviewFrame";

const TREE = [
  { depth: 0, name: "release-v1.2.0/", accent: true },
  { depth: 1, name: "├── plugin.wasm", hash: "SHA256: a3f1…c9e2" },
  { depth: 1, name: "├── README.md" },
  { depth: 1, name: "├── CHANGELOG.md" },
  { depth: 1, name: "└── plugin.toml" },
];

export function FileTreePreview() {
  return (
    <PreviewFrame label="release">
      <div className="font-mono text-xs md:text-sm space-y-1.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-dim text-[10px] uppercase tracking-widest">
            {"// github auto-publish"}
          </span>
          <span className="text-accent text-[10px]">v1.2.0 → published</span>
        </div>
        {TREE.map((node) => (
          <div
            key={node.name}
            className="flex items-center justify-between fade-up"
            style={{ paddingLeft: `${node.depth * 12}px` }}
          >
            <span className={node.accent ? "text-accent" : "text-text-primary"}>
              {node.name}
            </span>
            {node.hash && (
              <span className="text-text-dim text-[10px]">{node.hash}</span>
            )}
          </div>
        ))}
        <div className="pt-4 mt-4 border-t border-border-default flex items-center justify-between">
          <span className="text-text-dim text-[10px] uppercase tracking-widest">
            {"// synced from"}
          </span>
          <span className="text-text-muted text-[10px]">
            github.com/author/plugin
          </span>
        </div>
      </div>
    </PreviewFrame>
  );
}
