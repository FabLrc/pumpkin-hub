"use client";

import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";

type LogicNodeProps = NodeProps<Node<StudioNodeData>>;

export function LogicNode({ data, selected }: LogicNodeProps) {
  const isConditional = data.definition.node_id.startsWith("logic.if");

  return (
    <div
      className={`min-w-[160px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: data.color || "#a855f7" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5]">
        {isConditional && (
          <div className="flex items-center gap-2 py-0.5">
            <Handle
              type="target"
              position={Position.Top}
              id="exec-in"
              className="!w-2.5 !h-2.5 !bg-white"
            />
            <span className="opacity-60">Exec</span>
          </div>
        )}

        {data.definition.parameters.map((param) => (
          <div key={param.id} className="flex items-center gap-2 py-0.5">
            <Handle
              type="target"
              position={Position.Left}
              id={param.id}
              className="!w-3 !h-3"
              style={{ backgroundColor: param.param_type === "boolean" ? "#a855f7" : "#22c55e" }}
              title={`${param.label} (${param.param_type})`} />
            <span className="opacity-60">{param.label}</span>
          </div>
        ))}

        {isConditional && (
          <div className="flex items-center justify-around gap-4 py-1 mt-1 border-t border-[#333]">
            <div className="flex flex-col items-center gap-0.5">
              <Handle
                type="source"
                position={Position.Bottom}
                id="true"
                className="!w-3 !h-3 !bg-[#22c55e]"
                title="Vrai"
              />
              <span className="text-[10px] text-[#22c55e]">Vrai</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Handle
                type="source"
                position={Position.Bottom}
                id="false"
                className="!w-3 !h-3 !bg-red-400"
                title="Faux"
              />
              <span className="text-[10px] text-red-400">Faux</span>
            </div>
          </div>
        )}

        {!isConditional && (
          <Handle type="source" position={Position.Bottom} id="result" className="!w-3 !h-3 !bg-[#a855f7]" title="Résultat" />
        )}
      </div>
    </div>
  );
}
