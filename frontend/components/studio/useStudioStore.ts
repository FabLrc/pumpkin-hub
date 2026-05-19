"use client";

import { create } from "zustand";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import type { CSSProperties } from "react";

import type { StudioNodeDefinition, StudioNodeData } from "@/lib/types";
import { parseSlots } from "./utils";

const HANDLE_COLORS: Record<string, string> = {
  player: "#0000FF",
  string: "#FF00FF",
  number: "#00FF00",
  boolean: "#FF0000",
};

const EXEC_HANDLES = new Set(["exec", "exec-in", "true", "false"]);

function isExecHandle(handle: string | null | undefined): boolean {
  return !!handle && EXEC_HANDLES.has(handle);
}

function getEdgeStyle(
  sourceNode: StudioNode | undefined,
  sourceHandle: string | null | undefined,
): CSSProperties {
  if (!sourceHandle || isExecHandle(sourceHandle)) {
    return { stroke: "#e5e5e5", strokeWidth: 1 };
  }
  const defs = sourceNode?.data?.definition?.outputs;
  if (!defs) return { stroke: "#f97316", strokeWidth: 2 };
  const output = defs.find((o) => o.id === sourceHandle);
  const color = output ? HANDLE_COLORS[output.output_type] || "#f97316" : "#f97316";
  return { stroke: color, strokeWidth: 2 };
}

type StudioNode = Node<StudioNodeData>;

interface StudioState {
  nodes: StudioNode[];
  edges: Edge[];
  selectedNode: StudioNode | null;
  projectId: string | null;
  projectName: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  buildStatus: "idle" | "queued" | "running" | "success" | "failed";
  buildErrorMessage: string | null;
  buildId: string | null;
  tutorialStep: number;
  isTutorialActive: boolean;

  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNodeFromDefinition: (def: StudioNodeDefinition, position: { x: number; y: number }) => void;
  removeSelected: () => void;
  setSelectedNode: (node: StudioNode | null) => void;
  updateNodeValue: (nodeId: string, key: string, value: unknown) => void;
  setProjectId: (id: string | null) => void;
  initProjectName: (name: string) => void;
  setProjectName: (name: string) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSavedAt: (date: Date) => void;
  setBuildStatus: (status: StudioState["buildStatus"]) => void;
  setBuildErrorMessage: (msg: string | null) => void;
  setBuildId: (id: string | null) => void;
  markSaved: () => void;
  setTutorialStep: (step: number) => void;
  setIsTutorialActive: (active: boolean) => void;
  loadFlow: (nodes: StudioNode[], edges: Edge[]) => void;
  reset: () => void;
}

const initialNodes: StudioNode[] = [];
const initialEdges: Edge[] = [];

export const useStudioStore = create<StudioState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNode: null,
  projectId: null,
  projectName: "Nouveau projet",
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  buildStatus: "idle",
  buildErrorMessage: null,
  buildId: null,
  tutorialStep: 0,
  isTutorialActive: false,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as StudioNode[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const nodes = get().nodes;
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const isExec = isExecHandle(connection.sourceHandle) && isExecHandle(connection.targetHandle);
    const edge: Edge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || null,
      targetHandle: connection.targetHandle || null,
      type: isExec ? "exec" : undefined,
      animated: isExec,
      style: getEdgeStyle(sourceNode, connection.sourceHandle),
    };
    set({ edges: addEdge(edge, get().edges), isDirty: true });
  },

  addNodeFromDefinition: (def, position) => {
    const validTypes = ["event", "action", "logic", "data", "math"];
    const initialValues: Record<string, unknown> = {};
    for (const param of def.parameters) {
      if (param.default_value !== undefined) {
        initialValues[param.id] = param.default_value;
      }
    }
    const nodeType =
      def.node_id === "data.format-text"
        ? "formatText"
        : validTypes.includes(def.category)
          ? def.category
          : "default";
    const node: StudioNode = {
      id: crypto.randomUUID(),
      type: nodeType,
      position,
      data: {
        definition: def,
        values: initialValues,
        label: def.label,
        color: def.color,
      },
    };
    set({ nodes: [...get().nodes, node], isDirty: true });
  },

  removeSelected: () => {
    const { selectedNode } = get();
    if (!selectedNode) return;
    set({
      nodes: get().nodes.filter((n) => n.id !== selectedNode.id),
      edges: get().edges.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id,
      ),
      selectedNode: null,
      isDirty: true,
    });
  },

  setSelectedNode: (node) => set({ selectedNode: node }),

  updateNodeValue: (nodeId, key, value) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    const isFormatTextTemplate =
      node?.data.definition.node_id === "data.format-text" && key === "template";

    const newNodes = get().nodes.map((n) => {
      if (n.id !== nodeId) return n;
      return {
        ...n,
        data: { ...n.data, values: { ...n.data.values, [key]: value } },
      };
    });

    let newEdges = get().edges;
    if (isFormatTextTemplate) {
      const template = typeof value === "string" ? value : "";
      const activeSlots = new Set(parseSlots(template));
      newEdges = newEdges.filter((e) => {
        if (e.target !== nodeId) return true;
        const handle = typeof e.targetHandle === "string" ? e.targetHandle : "";
        return activeSlots.has(handle);
      });
    }

    set({ nodes: newNodes, edges: newEdges, isDirty: true });
  },

  setProjectId: (id) => set({ projectId: id }),
  initProjectName: (name) => set({ projectName: name }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),
  setBuildStatus: (status) => set({ buildStatus: status }),
  setBuildErrorMessage: (msg) => set({ buildErrorMessage: msg }),
  setBuildId: (id) => set({ buildId: id }),
  setTutorialStep: (step) => set({ tutorialStep: step }),
  setIsTutorialActive: (active) => set({ isTutorialActive: active }),

  loadFlow: (nodes, edges) => set({ nodes, edges, isDirty: false, lastSavedAt: new Date() }),
  markSaved: () => set({ isDirty: false, isSaving: false, lastSavedAt: new Date() }),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      projectId: null,
      projectName: "Nouveau projet",
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      buildStatus: "idle",
      buildErrorMessage: null,
      buildId: null,
    }),
}));
