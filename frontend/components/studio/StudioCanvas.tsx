"use client";

import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useStudioStore } from "./useStudioStore";
import { EventNode, ActionNode } from "./NodeComponents";

const nodeTypes: NodeTypes = {
  event: EventNode,
  action: ActionNode,
};

const defaultEdgeOptions = {
  style: { stroke: "#f97316", strokeWidth: 2 },
  animated: true,
};

export function StudioCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNode } =
    useStudioStore();

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: unknown) => {
      setSelectedNode(node as never);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="flex-1 h-full">
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
        fitView
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={20}
          size={1}
          color="#1a1a2e"
        />
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
