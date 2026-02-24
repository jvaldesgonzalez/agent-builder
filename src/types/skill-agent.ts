// ── Skill Agent Types ────────────────────────────────────────────────

/** Parameter definition for a skill (e.g. file path for search) */
export interface SkillParam {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  /** For file params: "file" | "text" */
  type?: "file" | "text";
}

/** Skill definition - a capability the agent can load on demand */
export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  toolNames: string[];
  params?: SkillParam[];
}

/** Enabled skill with its config values */
export interface EnabledSkill {
  id: string;
  config: Record<string, string>;
}

/** Skill Agent configuration - single agent with skills */
export interface SkillAgent {
  id: string;
  name: string;
  basePrompt: string;
  skills: EnabledSkill[];
  createdAt?: string;
  updatedAt?: string;
}
