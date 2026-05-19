"use client";

import { useMemo } from "react";
import { type NodeProps, Handle, Position } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { StudioNodeData } from "@/lib/types";
import { parseSlots } from "../utils";

type FormatTextNodeProps = NodeProps<Node<StudioNodeData>>;

export function FormatTextNode({ data, selected }: FormatTextNodeProps) {
  const template = (data.values.template as string) ?? "";
  const slots = useMemo(() => parseSlots(template), [template]);

  return (
    <div
      className={`min-w-[200px] border ${
        selected ? "shadow-[0_0_0_2px_#f97316]" : "border-[#333]"
      }`}
    >
      <div
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white text-center"
        style={{ backgroundColor: data.color || "#22c55e" }}
      >
        {data.label}
      </div>
      <div className="bg-[#1a1a2e] px-3 py-2 text-xs text-[#e5e5e5] relative">
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-[#666] mb-1">
            Template
          </div>
          <div
            className="font-mono text-[11px] text-[#e5e5e5] bg-[#0a0a0a] border border-[#262626] px-2 py-1 break-words min-h-[22px]"
            title="Édite dans le panneau Propriétés"
          >
            {template || <span className="text-[#555]">(vide)</span>}
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="text-[10px] text-[#555] italic py-1">
            Pas encore de variable. Tapez{" "}
            <span className="font-mono text-[#888]">{"{nom}"}</span> dans le template.
          </div>
        ) : (
          slots.map((slot) => (
            <div
              key={slot}
              className="relative flex items-center py-1"
              style={{ minHeight: 22 }}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={slot}
                style={{
                  position: "relative",
                  left: "auto",
                  right: "auto",
                  top: "auto",
                  transform: "none",
                  backgroundColor: "#FF00FF",
                }}
                className="!w-3 !h-3 !shrink-0"
                title={`Variable {${slot}} (string)`}
              />
              <span className="font-mono opacity-80 ml-2">{`{${slot}}`}</span>
            </div>
          ))
        )}

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
            backgroundColor: "#FF00FF",
          }}
          className="!w-3 !h-3"
          title="Texte résultant"
        />
      </div>
    </div>
  );
}
