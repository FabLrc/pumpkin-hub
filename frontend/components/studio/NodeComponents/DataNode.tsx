"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type DataNodeProps = NodeProps<Node<StudioNodeData>>;

const handleColors: Record<string, string> = {
  string: "#FF00FF",
  number: "#00FF00",
  boolean: "#FF0000",
  player: "#0000FF",
};

export function DataNode({ data, selected }: DataNodeProps) {
  return (
    <div
      className={`min-w-[160px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white text-center"
        style={{ backgroundColor: data.color || "#22c55e" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
        {data.definition.description && (
          <p className="mb-1 opacity-60">{data.definition.description}</p>
        )}

        {data.definition.parameters.map((param) => (
          <div key={param.id} className="relative flex items-center py-1" style={{ minHeight: 22 }}>
            <Handle
              type="target"
              position={Position.Left}
              id={param.id}
              style={{
                position: "relative",
                left: "auto",
                right: "auto",
                top: "auto",
                transform: "none",
                backgroundColor: handleColors[param.param_type] || "#888",
              }}
              className="!w-3 !h-3 !shrink-0"
              title={`${param.label} (${param.param_type})`}
            />
            <span className="opacity-60 ml-2">{param.label}</span>
          </div>
        ))}

        <Handle
          type="source"
          position={Position.Right}
          id="value"
          style={{
            position: "absolute",
            right: "-6px",
            left: "auto",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: data.definition.outputs[0] ? handleColors[data.definition.outputs[0].output_type] || "#22c55e" : "#22c55e",
          }}
          className="!w-3 !h-3"
        />
      </div>
    </div>
  );
}
