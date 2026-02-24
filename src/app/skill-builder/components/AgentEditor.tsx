"use client";

import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import type { SkillAgent, EnabledSkill } from "@/types/skill-agent";
import type { Skill, SkillParam } from "@/types/skill-agent";

interface AgentEditorProps {
  agent: SkillAgent;
  onUpdate: (agent: SkillAgent) => void;
}

export default function AgentEditor({ agent, onUpdate }: AgentEditorProps) {
  const [name, setName] = useState(agent.name);
  const [basePrompt, setBasePrompt] = useState(agent.basePrompt);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSelectorOpen, setSkillSelectorOpen] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setBasePrompt(agent.basePrompt);
  }, [agent.id, agent.name, agent.basePrompt]);

  useEffect(() => {
    fetch("/api/skill-agent/skills")
      .then((r) => r.json())
      .then(setSkills)
      .catch(console.error);
  }, []);

  const save = (updates: Partial<SkillAgent>) => {
    onUpdate({ ...agent, ...updates });
    fetch(`/api/skill-agent/${agent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...agent, ...updates }),
    }).catch(console.error);
  };

  const handleNameBlur = () => {
    if (name !== agent.name) save({ name });
  };
  const handleBasePromptBlur = () => {
    if (basePrompt !== agent.basePrompt) save({ basePrompt });
  };

  const addSkill = (skill: Skill) => {
    const config: Record<string, string> = {};
    for (const p of skill.params ?? []) {
      if (p.required) config[p.key] = "";
    }
    const newSkills: EnabledSkill[] = [
      ...agent.skills,
      { id: skill.id, config },
    ];
    save({ skills: newSkills });
    setSkillSelectorOpen(false);
  };

  const removeSkill = (skillId: string) => {
    save({ skills: agent.skills.filter((s) => s.id !== skillId) });
  };

  const updateSkillConfig = (skillId: string, key: string, value: string) => {
    const updated = agent.skills.map((s) =>
      s.id === skillId ? { ...s, config: { ...s.config, [key]: value } } : s
    );
    save({ skills: updated });
  };

  const alreadyAdded = new Set(agent.skills.map((s) => s.id));
  const availableToAdd = skills.filter((s) => !alreadyAdded.has(s.id));

  return (
    <div className="space-y-6">
      <section>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Agent name"
        />
      </section>

      <section>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Base Prompt
        </label>
        <textarea
          value={basePrompt}
          onChange={(e) => setBasePrompt(e.target.value)}
          onBlur={handleBasePromptBlur}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="You are a helpful assistant..."
        />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Skills</label>
          <div className="relative">
            <button
              onClick={() => setSkillSelectorOpen(!skillSelectorOpen)}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              <Plus size={14} /> Add skill
            </button>
            {skillSelectorOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSkillSelectorOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {availableToAdd.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">
                      All skills added
                    </p>
                  ) : (
                    availableToAdd.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addSkill(s)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-1 text-gray-500">({s.id})</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {agent.skills.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
            No skills yet. Add a skill to enable capabilities.
          </p>
        ) : (
          <div className="space-y-3">
            {agent.skills.map((es) => {
              const skill = skills.find((s) => s.id === es.id);
              return (
                <div
                  key={es.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {skill?.name ?? es.id}
                    </span>
                    <button
                      onClick={() => removeSkill(es.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {skill?.params && skill.params.length > 0 && (
                    <div className="space-y-2">
                      {skill.params.map((p: SkillParam) => (
                        <SkillParamInput
                          key={p.key}
                          param={p}
                          value={es.config[p.key] ?? ""}
                          onChange={(v) =>
                            updateSkillConfig(es.id, p.key, v)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SkillParamInput({
  param,
  value,
  onChange,
}: {
  param: SkillParam;
  value: string;
  onChange: (v: string) => void;
}) {
  const [files, setFiles] = useState<{ filePath: string; name: string }[]>([]);

  useEffect(() => {
    if (param.type === "file") {
      fetch("/api/knowledge-base/files")
        .then((r) => r.json())
        .then((data) =>
          setFiles(
            (Array.isArray(data) ? data : []).map((f: { filePath: string; name: string }) => ({
              filePath: f.filePath.replace(/^\//, ""),
              name: f.name,
            }))
          )
        )
        .catch(console.error);
    }
  }, [param.type]);

  if (param.type === "file") {
    return (
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">
          {param.label}
          {param.required && " *"}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">
            {param.required ? "Select a file..." : "(optional)"}
          </option>
          {files.map((f) => (
            <option key={f.filePath} value={f.filePath}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-0.5 block text-xs text-gray-500">
        {param.label}
        {param.required && " *"}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.description}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
    </div>
  );
}
