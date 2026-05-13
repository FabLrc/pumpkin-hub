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

const nodeTypes: NodeTypes = {
  event: EventNode,
  action: ActionNode,
  logic: LogicNode,
  data: DataNode,
  math: MathNode,
  default: DefaultNode,
};

const defaultEdgeOptions = {
  style: { stroke: "#f97316", strokeWidth: 2 },
  animated: true,
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
    <div className="flex-1 h-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
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
