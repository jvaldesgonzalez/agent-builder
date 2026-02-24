"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AgentList from "./components/AgentList";
import AgentEditor from "./components/AgentEditor";
import ChatPreview from "./components/ChatPreview";
import type { SkillAgent } from "@/types/skill-agent";

export default function SkillBuilderPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<SkillAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/skill-agent");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching skill agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedId);

  const handleCreateNew = async () => {
    try {
      const res = await fetch("/api/skill-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Skill Agent", basePrompt: "You are a helpful assistant." }),
      });
      if (res.ok) {
        const created = await res.json();
        setAgents((prev) => [created, ...prev]);
        setSelectedId(created.id);
      }
    } catch (error) {
      console.error("Error creating agent:", error);
    }
  };

  const handleSelect = (id: string) => setSelectedId(id);
  const handleUpdate = (agent: SkillAgent) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? agent : a))
    );
  };
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/skill-agent/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== id));
        if (selectedId === id) {
          const next = agents.find((a) => a.id !== id);
          setSelectedId(next?.id ?? null);
        }
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Skill Agent Builder</h1>
        </div>
        <button
          onClick={handleCreateNew}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New Agent
        </button>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-gray-500">
          Loading...
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
            <AgentList
              agents={agents}
              selectedId={selectedId}
              onSelect={handleSelect}
              onDelete={handleDelete}
            />
          </aside>
          <main className="flex flex-1 overflow-auto">
            {selectedAgent ? (
              <div className="flex w-full gap-6 p-6">
                <div className="min-w-0 flex-1">
                  <AgentEditor
                    agent={selectedAgent}
                    onUpdate={handleUpdate}
                  />
                </div>
                <div className="w-[400px] shrink-0">
                  <ChatPreview agentId={selectedAgent.id} agentName={selectedAgent.name} />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
                <p>Select an agent or create a new one</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
