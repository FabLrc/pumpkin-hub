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

import type { StudioNodeDefinition, StudioNodeData } from "@/lib/types";

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
  buildLogs: string[];
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
  setProjectName: (name: string) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSavedAt: (date: Date) => void;
  setBuildStatus: (status: StudioState["buildStatus"]) => void;
  setBuildLogs: (logs: string[]) => void;
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
  buildLogs: [],
  tutorialStep: 0,
  isTutorialActive: false,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as StudioNode[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges), isDirty: true });
  },

  addNodeFromDefinition: (def, position) => {
    const node: StudioNode = {
      id: `${def.node_id}-${Date.now()}`,
      type: def.category === "event" ? "event" : def.category === "action" ? "action" : "default",
      position,
      data: {
        definition: def,
        values: {},
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
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: { ...n.data, values: { ...n.data.values, [key]: value } },
        };
      }),
      isDirty: true,
    });
  },

  setProjectId: (id) => set({ projectId: id }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),
  setBuildStatus: (status) => set({ buildStatus: status }),
  setBuildLogs: (logs) => set({ buildLogs: logs }),
  setTutorialStep: (step) => set({ tutorialStep: step }),
  setIsTutorialActive: (active) => set({ isTutorialActive: active }),

  loadFlow: (nodes, edges) => set({ nodes, edges, isDirty: false }),

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
      buildLogs: [],
    }),
}));
