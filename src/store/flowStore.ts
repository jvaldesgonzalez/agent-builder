import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type { AppNode, AppEdge, ConditionEdgeData, Tool, InfoCollectionItem, KnowledgeBase } from "@/types";
import { AgentNodeType, ConditionType } from "@/types";
import {
  createInitialNodes,
  createInitialEdges,
  createNode,
  createEdge,
  generateNodeId,
} from "@/lib/defaults";

const STORAGE_KEY = "agent-builder-flow";

// ── Store types ─────────────────────────────────────────────────
interface FlowState {
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // React Flow change handlers
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;

  // Selection
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;

  // Node CRUD
  addNode: (node: AppNode) => void;
  addChildNode: (
    parentId: string,
    childType: AgentNodeType,
    edgeLabel?: string
  ) => void;
  updateNodeData: (
    nodeId: string,
    data: Partial<Record<string, unknown>>
  ) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

  // Edge CRUD
  addEdge: (edge: AppEdge) => void;
  updateEdgeData: (
    edgeId: string,
    data: Partial<ConditionEdgeData>
  ) => void;
  deleteEdge: (edgeId: string) => void;

  // Tool management
  addToolToNode: (nodeId: string, tool: Tool) => void;
  removeToolFromNode: (nodeId: string, toolId: string) => void;
  updateToolInNode: (nodeId: string, toolId: string, updates: Partial<Tool>) => void;

  // Info Collection management
  addInfoCollectionToNode: (nodeId: string, item: InfoCollectionItem) => void;
  removeInfoCollectionFromNode: (nodeId: string, itemId: string) => void;
  updateInfoCollectionInNode: (nodeId: string, itemId: string, updates: Partial<InfoCollectionItem>) => void;

  // Knowledge Base management
  addKnowledgeBaseToNode: (nodeId: string, kb: KnowledgeBase) => void;
  removeKnowledgeBaseFromNode: (nodeId: string, kbId: string) => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

// ── Helper: compute position below parent (centered) ─────────────
function getChildPosition(
  parentNode: AppNode,
  siblingCount: number,
  childType?: AgentNodeType
): { x: number; y: number } {
  // Estimate node widths for centering
  const getNodeWidth = (type: string | undefined) => {
    switch (type) {
      case AgentNodeType.Agent: return 260;
      case AgentNodeType.Start: return 100;
      case AgentNodeType.Tool: return 150;
      case AgentNodeType.End: return 100;
      case AgentNodeType.SelectAgent: return 150;
      default: return 150;
    }
  };
  
  const parentWidth = getNodeWidth(parentNode.type);
  const childWidth = getNodeWidth(childType);
  
  // Center child relative to parent
  const centerOffset = (parentWidth - childWidth) / 2;
  
  // For multiple siblings, offset horizontally
  const siblingOffset = siblingCount * 250;
  
  return {
    x: parentNode.position.x + centerOffset + siblingOffset,
    y: parentNode.position.y + 180,
  };
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: createInitialNodes(),
  edges: createInitialEdges(),
  selectedNodeId: null,
  selectedEdgeId: null,

  // ── React Flow handlers ─────────────────────────────────────
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
    get().saveToLocalStorage();
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().saveToLocalStorage();
  },

  // ── Selection ───────────────────────────────────────────────
  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  // ── Add node directly (e.g., from edge drop) ────────────────
  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      selectedNodeId: node.id,
      selectedEdgeId: null,
    });
    get().saveToLocalStorage();
  },

  // ── Add child node from "+" button ──────────────────────────
  addChildNode: (parentId, childType, edgeLabel) => {
    const { nodes, edges } = get();
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return;

    // Count existing children to offset new node
    const existingChildren = edges.filter((e) => e.source === parentId).length;
    const position = getChildPosition(parent, existingChildren, childType);

    const newNode = createNode(childType, position);

    // Determine condition type based on parent type
    const parentType = parent.type as AgentNodeType;
    let conditionType: ConditionType | null;
    
    if (parentType === AgentNodeType.Start) {
      // Start edges have no condition
      conditionType = null;
    } else if (parentType === AgentNodeType.Tool) {
      conditionType = ConditionType.ToolResult;
    } else {
      conditionType = ConditionType.LLMCondition;
    }

    const label = edgeLabel || "New condition";
    const newEdge = createEdge(parentId, newNode.id, label, conditionType);

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
      selectedNodeId: newNode.id,
      selectedEdgeId: null,
    });
    get().saveToLocalStorage();
  },

  // ── Update node data ────────────────────────────────────────
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
    get().saveToLocalStorage();
  },

  // ── Delete node & connected edges ───────────────────────────
  deleteNode: (nodeId) => {
    if (nodeId === "start-node") return; // can't delete start
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId:
        get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
    get().saveToLocalStorage();
  },

  // ── Duplicate node ──────────────────────────────────────────
  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const newId = generateNodeId();
    const clone: AppNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: { ...node.data },
    };
    set({ nodes: [...get().nodes, clone], selectedNodeId: newId });
    get().saveToLocalStorage();
  },

  // ── Edge CRUD ───────────────────────────────────────────────
  addEdge: (edge) => {
    set({ edges: [...get().edges, edge] });
    get().saveToLocalStorage();
  },

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, ...data } as ConditionEdgeData }
          : e
      ),
    });
    get().saveToLocalStorage();
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      selectedEdgeId:
        get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
    get().saveToLocalStorage();
  },

  // ── Tool management ─────────────────────────────────────────
  addToolToNode: (nodeId, tool) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentTools = (n.data as any).tools || [];
          return {
            ...n,
            data: {
              ...n.data,
              tools: [...currentTools, tool],
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  removeToolFromNode: (nodeId, toolId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentTools = (n.data as any).tools || [];
          return {
            ...n,
            data: {
              ...n.data,
              tools: currentTools.filter((t: Tool) => t.id !== toolId),
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  updateToolInNode: (nodeId, toolId, updates) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentTools = (n.data as any).tools || [];
          return {
            ...n,
            data: {
              ...n.data,
              tools: currentTools.map((t: Tool) =>
                t.id === toolId ? { ...t, ...updates } : t
              ),
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  // ── Info Collection management ──────────────────────────────
  addInfoCollectionToNode: (nodeId, item) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentItems = (n.data as any).infoCollection || [];
          return {
            ...n,
            data: {
              ...n.data,
              infoCollection: [...currentItems, item],
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  removeInfoCollectionFromNode: (nodeId, itemId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentItems = (n.data as any).infoCollection || [];
          return {
            ...n,
            data: {
              ...n.data,
              infoCollection: currentItems.filter((item: InfoCollectionItem) => item.id !== itemId),
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  updateInfoCollectionInNode: (nodeId, itemId, updates) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentItems = (n.data as any).infoCollection || [];
          return {
            ...n,
            data: {
              ...n.data,
              infoCollection: currentItems.map((item: InfoCollectionItem) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  // ── Knowledge Base management ───────────────────────────────
  addKnowledgeBaseToNode: (nodeId, kb) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentKBs = (n.data as any).knowledgeBases || [];
          return {
            ...n,
            data: {
              ...n.data,
              knowledgeBases: [...currentKBs, kb],
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  removeKnowledgeBaseFromNode: (nodeId, kbId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId) {
          const currentKBs = (n.data as any).knowledgeBases || [];
          return {
            ...n,
            data: {
              ...n.data,
              knowledgeBases: currentKBs.filter((kb: KnowledgeBase) => kb.id !== kbId),
            },
          };
        }
        return n;
      }),
    });
    get().saveToLocalStorage();
  },

  // ── Persistence ─────────────────────────────────────────────
  saveToLocalStorage: () => {
    if (typeof window === "undefined") return;
    const { nodes, edges } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  },

  loadFromLocalStorage: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const { nodes, edges } = JSON.parse(raw);
      if (Array.isArray(nodes) && Array.isArray(edges)) {
        set({ nodes, edges });
      }
    } catch {
      // ignore corrupt data
    }
  },
}));
