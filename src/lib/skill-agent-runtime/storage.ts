import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import type { SkillAgent } from "@/types/skill-agent";
import { randomUUID } from "crypto";

const SKILL_AGENTS_DIR = path.join(process.cwd(), "public", "skill-agents");

async function ensureDir() {
  if (!existsSync(SKILL_AGENTS_DIR)) {
    await mkdir(SKILL_AGENTS_DIR, { recursive: true });
  }
}

export async function listSkillAgents(): Promise<SkillAgent[]> {
  await ensureDir();
  const files = await readdir(SKILL_AGENTS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));
  const agents: SkillAgent[] = [];

  for (const f of jsonFiles) {
    try {
      const content = await readFile(path.join(SKILL_AGENTS_DIR, f), "utf8");
      agents.push(JSON.parse(content));
    } catch {
      // Skip invalid files
    }
  }

  agents.sort(
    (a, b) =>
      new Date(b.updatedAt ?? 0).getTime() -
      new Date(a.updatedAt ?? 0).getTime()
  );
  return agents;
}

export async function getSkillAgent(id: string): Promise<SkillAgent | null> {
  await ensureDir();
  const filePath = path.join(SKILL_AGENTS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

export async function saveSkillAgent(agent: SkillAgent): Promise<void> {
  await ensureDir();
  const now = new Date().toISOString();
  const toSave = {
    ...agent,
    updatedAt: now,
    createdAt: agent.createdAt ?? now,
  };
  const filePath = path.join(SKILL_AGENTS_DIR, `${agent.id}.json`);
  await writeFile(filePath, JSON.stringify(toSave, null, 2));
}

export async function deleteSkillAgent(id: string): Promise<boolean> {
  const { unlink } = await import("fs/promises");
  const filePath = path.join(SKILL_AGENTS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return false;
  await unlink(filePath);
  return true;
}

export function createNewSkillAgent(
  name: string,
  basePrompt: string
): SkillAgent {
  return {
    id: randomUUID(),
    name,
    basePrompt,
    skills: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
