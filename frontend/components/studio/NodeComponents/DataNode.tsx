"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type DataNodeProps = NodeProps<Node<StudioNodeData>>;

const handleColors: Record<string, string> = {
  string: "#22c55e",
  number: "#22c55e",
  boolean: "#a855f7",
  player: "#f97316",
};

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
            {/* Data nodes accept typed inputs for override */}
            <Handle
              type="target"
              position={Position.Left}
              id={param.id}
              className="!w-2.5 !h-2.5"
              style={{ backgroundColor: handleColors[param.param_type] || "#888" }}
            />
          </div>
        ))}

        <Handle
          type="source"
          position={Position.Right}
          id="value"
          className="!w-2.5 !h-2.5"
          style={{ backgroundColor: data.definition.outputs[0] ? handleColors[data.definition.outputs[0].output_type] || "#22c55e" : "#22c55e" }}
        />
      </div>
    </div>
  );
}
