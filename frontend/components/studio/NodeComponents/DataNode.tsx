"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type DataNodeProps = NodeProps<Node<StudioNodeData>>;

export function DataNode({ data, selected }: DataNodeProps) {
  return (
    <div
      className={`min-w-[160px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: data.color || "#22c55e" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
        {data.definition.description && (
          <p className="mb-1 opacity-60">{data.definition.description}</p>
        )}
        {data.definition.parameters.map((param) => (
          <div key={param.id} className="flex items-center justify-between gap-2 py-0.5">
            <span className="opacity-60">{param.label}</span>
            <span className="text-[10px] text-[#888]">{param.default_value as string}</span>
          </div>
        ))}
        <Handle type="source" position={Position.Right} id="value" className="!w-2.5 !h-2.5 !bg-[#22c55e]" />
      </div>
    </div>
  );
}
