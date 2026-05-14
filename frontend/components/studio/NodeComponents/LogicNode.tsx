"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type LogicNodeProps = NodeProps<Node<StudioNodeData>>;

const handleColors: Record<string, string> = {
  player: "#0000FF",
  string: "#FF00FF",
  number: "#00FF00",
  boolean: "#FF0000",
};

export function LogicNode({ data, selected }: LogicNodeProps) {
  const isConditional = data.definition.node_id.startsWith("logic.if");

  return (
    <div
      className={`min-w-[160px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="relative px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white flex items-center"
        style={{ backgroundColor: data.color || "#a855f7" }}
      >
        {isConditional && (
          <Handle
            type="target"
            position={Position.Left}
            id="exec-in"
            style={{ position: "absolute", left: "-5px", right: "auto", top: "50%", transform: "translateY(-50%)" }}
            className="!w-3 !h-3 !bg-white"
            title="Flux d'entrée"
          />
        )}
        <span className="flex-1 text-center">{data.label}</span>
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
                backgroundColor: handleColors[param.param_type] || "#a855f7",
              }}
              className="!w-3 !h-3 !shrink-0"
              title={`${param.label} (${param.param_type})`}
            />
            <span className="opacity-60 ml-2">{param.label}</span>
          </div>
        ))}

        {isConditional && (
          <div className="flex items-center justify-around gap-4 py-1 mt-1 border-t border-[#333]">
            <div className="flex flex-col items-center gap-0.5">
              <Handle type="source" position={Position.Bottom} id="true" className="!w-3 !h-3 !bg-[#22c55e]" title="Vrai" />
              <span className="text-[10px] text-[#22c55e]">Vrai</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Handle type="source" position={Position.Bottom} id="false" className="!w-3 !h-3 !bg-red-400" title="Faux" />
              <span className="text-[10px] text-red-400">Faux</span>
            </div>
          </div>
        )}

        {!isConditional && (
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
              backgroundColor: "#FF00FF",
            }}
            className="!w-3 !h-3"
            title="Résultat"
          />
        )}
      </div>
    </div>
  );
}
