"use client";

import { useCallback, useMemo } from "react";
import type { Edge } from "@xyflow/react";
import { useStudioStore } from "./useStudioStore";

export function PropertyPanel() {
  const selectedNode = useStudioStore((s) => s.selectedNode);
  const updateNodeValue = useStudioStore((s) => s.updateNodeValue);
  const nodes = useStudioStore((s) => s.nodes);
  const edges = useStudioStore((s) => s.edges);

  const incomingDataEdges = useMemo(() => {
    if (!selectedNode) return new Map<string, Edge>();
    const map = new Map<string, Edge>();
    for (const edge of edges) {
      if (
        edge.target === selectedNode.id &&
        edge.targetHandle &&
        typeof edge.targetHandle === "string" &&
        edge.targetHandle !== "exec-in"
      ) {
        map.set(edge.targetHandle, edge);
      }
    }
    return map;
  }, [edges, selectedNode]);

  const inExecEdge = useMemo(() => {
    if (!selectedNode) return null;
    return edges.find((e) => e.target === selectedNode.id && e.targetHandle === "exec-in") ?? null;
  }, [edges, selectedNode]);

  const outExecEdges = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter((e) => e.source === selectedNode.id && e.sourceHandle === "exec");
  }, [edges, selectedNode]);

  const getSourceLabel = useCallback(
    (edge: Edge) => {
      const srcNode = nodes.find((n) => n.id === edge.source);
      const label = (srcNode?.data as Record<string, unknown>)?.definition
        ? ((srcNode?.data as Record<string, unknown>)?.definition as Record<string, unknown>)?.label as string
        : edge.source;
      return label;
    },
    [nodes],
  );

  const getTargetLabel = useCallback(
    (edge: Edge) => {
      const tgtNode = nodes.find((n) => n.id === edge.target);
      const label = (tgtNode?.data as Record<string, unknown>)?.definition
        ? ((tgtNode?.data as Record<string, unknown>)?.definition as Record<string, unknown>)?.label as string
        : edge.target;
      return label;
    },
    [nodes],
  );

  const handleChange = useCallback(
    (nodeId: string, paramId: string, paramType: string, rawValue: string) => {
      let parsed: unknown = rawValue;
      if (paramType === "number") {
        parsed = rawValue === "" ? "" : Number(rawValue);
      }
      updateNodeValue(nodeId, paramId, parsed);
    },
    [updateNodeValue],
  );

  if (!selectedNode) {
    return (
      <div className="w-48 lg:w-64 bg-[#0a0a0a] border-l border-[#262626] flex-shrink-0">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] border-b border-[#262626]">
          Propriétés
        </div>
        <div className="p-3 text-xs text-[#666]">
          <p className="mb-3">Sélectionnez un nœud pour éditer ses propriétés</p>
          <div className="text-[10px] space-y-2 text-[#555] border-t border-[#262626] pt-3">
            <p><span className="text-[#f97316]">{nodes.length}</span> nœud{nodes.length > 1 ? "s" : ""}</p>
            <p><span className="text-[#f97316]">{edges.length}</span> connexion{edges.length > 1 ? "s" : ""}</p>
            <p className="mt-2 text-[10px] text-[#444]">⌫ Supprimer</p>
            <p className="text-[#444] text-[10px]">✲ Naviguer</p>
          </div>
        </div>
      </div>
    );
  }

  const { definition, values } = selectedNode.data;

  return (
    <div className="w-48 lg:w-64 bg-[#0a0a0a] border-l border-[#262626] overflow-y-auto flex-shrink-0">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] border-b border-[#262626]">
        Propriétés
      </div>
      <div className="p-3">
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-[#666] mb-1">Nœud</div>
          <div className="text-xs text-[#e5e5e5] font-semibold">{definition.label}</div>
        </div>

        {definition.category !== "data" && definition.category !== "math" && (
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-widest text-[#666] mb-1">Flux d&apos;exécution</div>
            {inExecEdge ? (
              <div className="flex items-center gap-1.5 text-[10px] text-[#666] bg-[#1a1a2e] border border-[#333] px-2 py-1.5 mb-1 cursor-default">
                <span className="text-white">&#9660;</span>
                <span>← {getSourceLabel(inExecEdge)}</span>
              </div>
            ) : definition.category === "event" ? (
              <div className="text-[10px] text-[#555] mb-1">Point d&apos;entrée</div>
            ) : (
              <div className="text-[10px] text-[#444] mb-1">Non connecté</div>
            )}
            {outExecEdges.length > 0 ? (
              outExecEdges.map((e) => (
                <div key={e.id} className="flex items-center gap-1.5 text-[10px] text-[#666] bg-[#1a1a2e] border border-[#333] px-2 py-1.5 mb-0.5 cursor-default">
                  <span className="text-white">&#9654;</span>
                  <span>{getTargetLabel(e)} →</span>
                </div>
              ))
            ) : definition.category !== "event" && definition.category !== "action" && definition.category !== "logic" ? null : (
              <div className="text-[10px] text-[#444]">Terminal</div>
            )}
          </div>
        )}

        {definition.parameters.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-widest text-[#666] mb-1">
              Paramètres
            </div>
            {definition.parameters.map((param) => {
              const boundEdge = incomingDataEdges.get(param.id);
              return (
                <div key={param.id} className="mb-2">
                  <label className="block text-[10px] text-[#888] mb-0.5">
                    {param.label}
                    {param.required && <span className="text-[#f97316] ml-0.5">*</span>}
                  </label>
                  {boundEdge ? (
                    <div
                      className="flex items-center gap-1.5 text-[10px] text-[#666] bg-[#1a1a2e] 
                                  border border-[#333] px-2 py-1.5 cursor-default"
                      title="Connecté via un edge de données"
                    >
                      <span className="text-[#22c55e]">&#9679;</span>
                      <span>
                        ← {getSourceLabel(boundEdge)}.{boundEdge.sourceHandle as string}
                      </span>
                    </div>
                  ) : param.param_type === "boolean" ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!values[param.id]}
                        onChange={(e) => updateNodeValue(selectedNode.id, param.id, e.target.checked)}
                        className="accent-[#f97316]"
                      />
                      <span className="text-[10px] text-[#888]">{param.label}</span>
                    </label>
                  ) : param.options && param.options.length > 0 ? (
                    <select
                      value={(values[param.id] as string) ?? ""}
                      onChange={(e) => handleChange(selectedNode.id, param.id, param.param_type, e.target.value)}
                      className="w-full bg-[#1a1a2e] border border-[#333] px-2 py-1 text-xs 
                                 text-[#e5e5e5] focus:outline-none focus:border-[#f97316]"
                    >
                      <option value="">Sélectionner...</option>
                      {param.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={param.param_type === "number" ? "number" : "text"}
                      value={(values[param.id] as string | number) ?? ""}
                      onChange={(e) => handleChange(selectedNode.id, param.id, param.param_type, e.target.value)}
                      placeholder={param.label}
                      className="w-full bg-[#1a1a2e] border border-[#333] px-2 py-1 text-xs 
                                 text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:border-[#f97316]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
