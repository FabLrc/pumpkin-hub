"use client";

import useSWR from "swr";
import type { StudioNodeDefinition } from "@/lib/types";
import { fetchStudioNodes } from "@/lib/api";
import { useStudioStore } from "./useStudioStore";

const categoryLabels: Record<string, string> = {
  event: "Événements",
  action: "Actions",
  logic: "Logique",
  data: "Données",
  math: "Math",
};

const categoryOrder = ["event", "action", "logic", "data", "math"];

export function NodePalette() {
  const { data } = useSWR("studio-nodes", fetchStudioNodes, { revalidateOnFocus: false });
  const addNodeFromDefinition = useStudioStore((s) => s.addNodeFromDefinition);

  const nodes = data?.nodes ?? [];

  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat] || cat,
      nodes: nodes.filter((n: StudioNodeDefinition) => n.category === cat),
    }))
    .filter((g) => g.nodes.length > 0);

  const handleDragStart = (e: React.DragEvent, node: StudioNodeDefinition) => {
    e.dataTransfer.setData("application/studio-node", JSON.stringify(node));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-56 bg-[#0a0a0a] border-r border-[#262626] overflow-y-auto flex-shrink-0">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] border-b border-[#262626]">
        Palette
      </div>
      {grouped.map((group) => (
        <div key={group.category} className="px-2 py-2">
          <div className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            {group.label}
          </div>
          {group.nodes.map((node) => (
            <button
              key={node.node_id}
              draggable
              onDragStart={(e) => handleDragStart(e, node)}
              onClick={() =>
                addNodeFromDefinition(node, {
                  x: 100 + Math.random() * 300,
                  y: 100 + Math.random() * 300,
                })
              }
              className="w-full text-left px-2 py-1.5 mb-0.5 text-xs text-[#e5e5e5] 
                         bg-[#1a1a2e] border border-[#333] hover:border-[#f97316] 
                         transition-colors cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 flex-shrink-0"
                  style={{ backgroundColor: node.color }}
                />
                <span>{node.label}</span>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
