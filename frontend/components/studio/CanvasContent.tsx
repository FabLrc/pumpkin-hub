"use client";

import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import type { NodeTypes, Edge, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useStudioStore } from "./useStudioStore";
import {
  EventNode,
  ActionNode,
  LogicNode,
  DataNode,
  MathNode,
  DefaultNode,
} from "./NodeComponents";

const EXEC_HANDLES = new Set(["exec", "exec-in", "true", "false"]);

function isExecHandle(handle: string | null | undefined): boolean {
  return !!handle && EXEC_HANDLES.has(handle);
}

const nodeTypes: NodeTypes = {
  event: EventNode,
  action: ActionNode,
  logic: LogicNode,
  data: DataNode,
  math: MathNode,
  default: DefaultNode,
};

function isTypeCompatible(sourceType: string, targetParamType: string): boolean {
  if (!sourceType || !targetParamType) return true;
  if (targetParamType === "select") return sourceType === "string";
  return sourceType === targetParamType;
}

export function CanvasContent() {
  const reactFlow = useReactFlow();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNode, addNodeFromDefinition } = useStudioStore();

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;

    const sourceIsExec = isExecHandle(connection.sourceHandle);
    const targetIsExec = isExecHandle(connection.targetHandle);

    if (sourceIsExec && targetIsExec) return true;
    if (sourceIsExec !== targetIsExec) return false;

    const sourceOutput = sourceNode.data.definition.outputs.find(
      (o) => o.id === connection.sourceHandle,
    );
    const targetParam = targetNode.data.definition.parameters.find(
      (p) => p.id === connection.targetHandle,
    );
    if (!sourceOutput || !targetParam) return true;
    return isTypeCompatible(sourceOutput.output_type, targetParam.param_type);
  }, [nodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: unknown) => {
      setSelectedNode(node as never);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/studio-node");
      if (!raw) return;
      try {
        const def = JSON.parse(raw);
        const position = reactFlow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addNodeFromDefinition(def, position);
      } catch {
        // ignore malformed drag payload
      }
    },
    [addNodeFromDefinition, reactFlow],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
      {nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-[#0a0a0a]/80 border border-[#262626] px-6 py-4 text-center max-w-xs">
            <p className="text-sm text-[#888] mb-2">
              Canvas vide
            </p>
            <p className="text-xs text-[#555]">
              Glissez des nœuds depuis la palette de gauche ou cliquez dessus pour les ajouter au canvas.
            </p>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        fitView
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#1a1a2e" />
        <Controls className="!bg-[#0a0a0a] !border-[#262626] !rounded-none" />
        <MiniMap
          className="!border-[#262626] !rounded-none"
          nodeColor="#1a1a2e"
          maskColor="rgba(10, 10, 10, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
