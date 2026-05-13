"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type DefaultNodeProps = NodeProps<Node<StudioNodeData>>;

export function DefaultNode({ data, selected }: DefaultNodeProps) {
  return (
    <div
      className={`min-w-[140px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: data.color || "#666" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
        <Handle type="target" position={Position.Left} id="target-default" className="!w-3 !h-3 !bg-[#666]" title="Entrée" />
        <Handle type="source" position={Position.Right} id="source-default" className="!w-3 !h-3 !bg-[#666]" title="Sortie" />
      </div>
    </div>
  );
}
