"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type MathNodeProps = NodeProps<Node<StudioNodeData>>;

export function MathNode({ data, selected }: MathNodeProps) {
  return (
    <div
      className={`min-w-[160px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: data.color || "#eab308" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
        {data.definition.parameters.map((param) => (
          <div key={param.id} className="flex items-center gap-2 py-0.5">
            <Handle
              type="target"
              position={Position.Left}
              id={param.id}
              className="!w-3 !h-3"
              style={{ backgroundColor: "#22c55e" }}
              title={`${param.label} (nombre)`}
            />
            <span className="opacity-60">{param.label}</span>
          </div>
        ))}
        <Handle type="source" position={Position.Right} id="result" className="!w-3 !h-3 !bg-[#22c55e]" title="Résultat" />
      </div>
    </div>
  );
}
