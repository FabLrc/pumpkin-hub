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
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white text-center"
        style={{ backgroundColor: data.color || "#eab308" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
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
                backgroundColor: "#00FF00",
              }}
              className="!w-3 !h-3 !shrink-0"
              title={`${param.label} (nombre)`}
            />
            <span className="opacity-60 ml-2">{param.label}</span>
          </div>
        ))}
        <Handle
          type="source"
          position={Position.Right}
          id="result"
          style={{
            position: "absolute",
            right: "-6px",
            left: "auto",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "#00FF00",
          }}
          className="!w-3 !h-3"
          title="Résultat"
        />
      </div>
    </div>
  );
}
