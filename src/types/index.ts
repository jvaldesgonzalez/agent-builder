import type { Node, Edge } from "@xyflow/react";

// ── Node type enum ──────────────────────────────────────────────
export enum AgentNodeType {
  Start = "start",
  Agent = "agent",
  Tool = "tool",
  SelectAgent = "selectAgent",
  End = "end",
}

// ── Edge condition types ────────────────────────────────────────
export enum ConditionType {
  LLMCondition = "llm_condition",
  ToolResult = "tool_result",
}

// ── Tool interface ──────────────────────────────────────────────
export interface Tool {
  id: string;
  name: string;
  description: string;
}

// ── Info Collection interface ───────────────────────────────────
export interface InfoCollectionItem {
  id: string;
  label: string;
  description: string;
}

// ── Knowledge Base interface ────────────────────────────────────
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
}

// ── Node data payloads ──────────────────────────────────────────
export interface StartNodeData {
  label: string;
  [key: string]: unknown;
}

export interface AgentNodeData {
  label: string;
  description: string;
  conversationGoal: string;
  llm: string;
  subItems: number;
  infoCollection?: InfoCollectionItem[];
  tools?: Tool[];
  knowledgeBases?: KnowledgeBase[];
  [key: string]: unknown;
}

export interface ToolNodeData {
  label: string;
  description: string;
  tools?: Tool[];
  [key: string]: unknown;
}

export interface SelectAgentNodeData {
  label: string;
  [key: string]: unknown;
}

export interface EndNodeData {
  label: string;
  [key: string]: unknown;
}

// ── Union helpers ───────────────────────────────────────────────
export type AnyNodeData =
  | StartNodeData
  | AgentNodeData
  | ToolNodeData
  | SelectAgentNodeData
  | EndNodeData;

export type AppNode = Node<AnyNodeData, string>;

// ── Edge data ───────────────────────────────────────────────────
export interface ConditionEdgeData {
  label: string;
  conditionType: ConditionType | null; // null for start edges (no condition)
  isSuccess?: boolean; // For tool result edges: true = success, false = failure
  conditionExpression?: string; // For LLM conditions: the condition logic
  [key: string]: unknown;
}

export type AppEdge = Edge<ConditionEdgeData>;
