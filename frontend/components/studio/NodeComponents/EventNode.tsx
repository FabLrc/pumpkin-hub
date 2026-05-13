"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type EventNodeProps = NodeProps<Node<StudioNodeData>>;

const handleColors: Record<string, string> = {
  player: "#f97316",
  string: "#22c55e",
  number: "#22c55e",
  boolean: "#a855f7",
};

export function EventNode({ data, selected }: EventNodeProps) {
  return (
    <div
      className={`min-w-[180px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: data.color || "#f97316" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
        {data.definition.description && (
          <p className="mb-1 opacity-60">{data.definition.description}</p>
        )}
        {data.definition.outputs.map((output) => (
          <div key={output.id} className="flex items-center gap-2 py-0.5">
            <span className="opacity-60 flex-1">{output.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              className="!w-2.5 !h-2.5 !border-2 !border-[#1a1a2e] !mr-0"
              style={{
                backgroundColor: handleColors[output.output_type] || "#888",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
