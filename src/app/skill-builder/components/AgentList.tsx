"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import type { SkillAgent } from "@/types/skill-agent";

interface AgentListProps {
  agents: SkillAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function AgentList({
  agents,
  selectedId,
  onSelect,
  onDelete,
}: AgentListProps) {
  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col p-3">
      <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Agents
      </h2>
      {agents.length === 0 ? (
        <p className="px-2 text-sm text-gray-400">No agents yet</p>
      ) : (
        <ul className="space-y-1">
          {agents.map((agent) => (
            <li key={agent.id} className="group relative">
              <button
                onClick={() => onSelect(agent.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === agent.id
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="block truncate">{agent.name}</span>
                <span className="block text-xs text-gray-400">
                  {formatDate(agent.updatedAt)} · {agent.skills.length} skills
                </span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm("Delete this agent?")) await onDelete(agent.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
