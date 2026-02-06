import type { AppNode, AppEdge, ConditionType } from "@/types";

// ── Serialized Types ────────────────────────────────────────────
export interface SerializedNode {
  id: string;
  type: string;
  label: string;
  data: {
    // All node data except position
    description?: string;
    conversationGoal?: string;
    llm?: string;
    tools?: Array<{ id: string; name: string; description: string }>;
    infoCollection?: Array<{ id: string; label: string; description: string }>;
    knowledgeBases?: Array<{ id: string; name: string; description: string }>;
  };
  transitions: SerializedTransition[];
}

export interface SerializedTransition {
  targetNodeId: string;
  condition: {
    type: ConditionType | null;
    label: string;
    expression?: string;
    isSuccess?: boolean;
  };
}

export interface SerializedFlow {
  version: string;
  startNodeId: string;
  nodes: SerializedNode[];
  metadata: {
    createdAt: string;
    validationStatus: "valid" | "invalid";
  };
}

// ── Serialization Function ─────────────────────────────────────
export function serializeFlow(
  nodes: AppNode[],
  edges: AppEdge[]
): SerializedFlow {
  // Find start node
  const startNode = nodes.find((n) => n.type === "start");
  if (!startNode) {
    throw new Error("No start node found in flow");
  }

  // Build serialized nodes
  const serializedNodes: SerializedNode[] = nodes.map((node) => {
    const nodeData = node.data as any;

    // Get outgoing edges for this node
    const outgoingEdges = edges.filter((edge) => edge.source === node.id);

    // Map edges to transitions
    const transitions: SerializedTransition[] = outgoingEdges.map((edge) => {
      const edgeData = edge.data as any;
      return {
        targetNodeId: edge.target,
        condition: {
          type: edgeData?.conditionType ?? null,
          label: edgeData?.label || "",
          expression: edgeData?.conditionExpression,
          isSuccess: edgeData?.isSuccess,
        },
      };
    });

    // Build node data based on type
    let data: SerializedNode["data"] = {};

    if (node.type === "agent") {
      data = {
        description: nodeData.description,
        conversationGoal: nodeData.conversationGoal,
        llm: nodeData.llm,
        tools: nodeData.tools || [],
        infoCollection: nodeData.infoCollection || [],
        knowledgeBases: nodeData.knowledgeBases || [],
      };
    } else if (node.type === "tool") {
      data = {
        description: nodeData.description,
        tools: nodeData.tools || [],
      };
    } else if (node.type === "end") {
      data = {
        description: nodeData.description,
      };
    }
    // start and selectAgent types don't need additional data

    return {
      id: node.id,
      type: node.type,
      label: nodeData.label || node.type,
      data,
      transitions,
    };
  });

  return {
    version: "1.0",
    startNodeId: startNode.id,
    nodes: serializedNodes,
    metadata: {
      createdAt: new Date().toISOString(),
      validationStatus: "valid",
    },
  };
}

// ── Download Utility ───────────────────────────────────────────
export function downloadFlowAsJson(
  flow: SerializedFlow,
  filename = "agent-flow.json"
) {
  const jsonString = JSON.stringify(flow, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
