"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type EventNodeProps = NodeProps<Node<StudioNodeData>>;

const handleColors: Record<string, string> = {
  player: "#0000FF",
  string: "#FF00FF",
  number: "#00FF00",
  boolean: "#FF0000",
};

export function EventNode({ data, selected }: EventNodeProps) {
  return (
    <div
      className={`min-w-[180px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      } group`}
    >
      <div
        className="relative px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white flex items-center"
        style={{ backgroundColor: data.color || "#f97316" }}
      >
        <span className="flex-1 text-center">{data.label}</span>
        <Handle
          type="source"
          position={Position.Right}
          id="exec"
          style={{ position: "absolute", right: "-5px", left: "auto", top: "50%", transform: "translateY(-50%)" }}
          className="!w-3 !h-3 !bg-white"
          title="Ordre d'exécution"
        />
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
        {data.definition.outputs.map((output) => (
          <div key={output.id} className="relative flex items-center py-1" style={{ minHeight: 22 }}>
            <span className="opacity-60 flex-1">{output.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              style={{
                position: "absolute",
                right: "-6px",
                left: "auto",
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: handleColors[output.output_type] || "#888",
              }}
              className="!w-3 !h-3 !border-2 !border-[#1a1a2e]"
              title={`${output.label} (${output.output_type})`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
