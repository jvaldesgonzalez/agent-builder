"use client";

import React from "react";
import { useFlowStore } from "@/store/flowStore";
import type { AgentNodeData } from "@/types";

export default function GeneralTab() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const data = node.data as unknown as AgentNodeData;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Conversation goal */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Conversation goal
        </label>
        <textarea
          value={data.conversationGoal ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            updateNodeData(node.id, {
              conversationGoal: value,
              description: value, // Update description when conversation goal changes
            });
          }}
          placeholder="Add a prompt to collect user information. Example: Ask the user about their needs."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[100px] resize-y"
        />
      </div>

      {/* LLM */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">LLM</label>
          <span className="text-xs text-gray-400">Using default</span>
        </div>
        <select
          value={data.llm ?? "GPT-4o"}
          onChange={(e) => updateNodeData(node.id, { llm: e.target.value })}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-300 focus:outline-none"
        >
          <option value="GPT-4o">GPT-4o</option>
          <option value="GPT-4o-mini">GPT-4o-mini</option>
          <option value="Claude-3.5-Sonnet">Claude-3.5-Sonnet</option>
        </select>
      </div>
    </div>
  );
}
