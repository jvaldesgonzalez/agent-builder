import { StateGraph, StateSchema, MessagesValue, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  BaseMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import type { StructuredToolInterface } from "@langchain/core/tools";
import * as z from "zod";
import type { SkillAgent, EnabledSkill } from "@/types/skill-agent";
import { getSkillById, BUILT_IN_SKILLS } from "@/lib/skills/registry";
import { searchTool, checkTimeSlotsTool, scheduleEventTool } from "./tools";
import { memoryStore } from "@/lib/agent-runtime/memory-store";

// State for skill agent - no transfer, just messages
const SkillAgentState = new StateSchema({
  messages: MessagesValue,
});

type ToolByName = Record<string, StructuredToolInterface>;

/** Build the load_skill tool for this agent's enabled skills */
function createLoadSkillTool(agent: SkillAgent) {
  const skillConfigByTitle = new Map(
    agent.skills.map((es) => [es.id, es.config])
  );

  return tool(
    async ({ skillName }: { skillName: string }) => {
      console.log(`[SkillAgent] Loading skill: ${skillName}`);
      const skill = BUILT_IN_SKILLS.find(
        (s) => s.id === skillName || s.name.toLowerCase() === skillName.toLowerCase()
      );
      if (!skill) {
        const available = BUILT_IN_SKILLS.map((s) => s.id).join(", ");
        return `Skill '${skillName}' not found. Available skills: ${available}`;
      }

      const config = skillConfigByTitle.get(skill.id) || {};
      let content = skill.content;

      // Inject param values into content for skills that need them
      if (skill.params?.length && config) {
        const paramBlock = skill.params
          .map((p) => `- ${p.key}: ${config[p.key] ?? "(not set)"}`)
          .join("\n");
        content = `${content}\n\n## Configured parameters\n${paramBlock}`;
        if (config.file) {
          content += `\n\nWhen using the search tool for this skill, use file="${config.file}"`;
        }
      }

      return `Loaded skill: ${skill.name}\n\n${content}`;
    },
    {
      name: "load_skill",
      description: `Load the full content of a skill into your context.

Use this when you need detailed instructions for a specific type of request.
Available skills: ${agent.skills.map((es) => es.id).join(", ")}.`,
      schema: z.object({
        skillName: z.string().describe("The id of the skill to load (e.g. search_catalog, schedule_appointment, answer_faqs)"),
      }),
    }
  );
}

/** Get built-in tools that are used by any enabled skill */
function getBuiltInToolsForAgent(agent: SkillAgent): ToolByName {
  const toolNames = new Set<string>();
  for (const es of agent.skills) {
    const skill = getSkillById(es.id);
    if (skill) skill.toolNames.forEach((n) => toolNames.add(n));
  }

  const tools: ToolByName = {};
  if (toolNames.has("search")) tools.search = searchTool;
  if (toolNames.has("check_time_slots")) tools.check_time_slots = checkTimeSlotsTool;
  if (toolNames.has("schedule_event")) tools.schedule_event = scheduleEventTool;
  return tools;
}

/** Build system prompt with skill descriptions */
function buildSystemPrompt(agent: SkillAgent): string {
  const skillsBlock = agent.skills
    .map((es) => {
      const skill = getSkillById(es.id);
      if (!skill) return null;
      return `- **${skill.id}**: ${skill.description}`;
    })
    .filter(Boolean)
    .join("\n");

  return `${agent.basePrompt}

## Available Skills

${skillsBlock || "No skills enabled."}

Use the load_skill tool when you need detailed instructions for handling a specific type of request.`;
}

export async function createSkillAgentGraph(agent: SkillAgent) {
  const loadSkill = createLoadSkillTool(agent);
  const builtInTools = getBuiltInToolsForAgent(agent);
  const allTools = [loadSkill, ...Object.values(builtInTools)];

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.7,
  });
  const modelWithTools = model.bindTools(allTools);

  const systemPrompt = buildSystemPrompt(agent);

  const agentNode = async (state: { messages: BaseMessage[] }) => {
    const response = await modelWithTools.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages,
    ]);
    return { messages: [response] };
  };

  const toolsByName: ToolByName = { load_skill: loadSkill, ...builtInTools };

  const toolNode = async (state: { messages: BaseMessage[] }) => {
    const lastMessage = state.messages.at(-1);
    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
      return { messages: [] };
    }

    const toolMessages: ToolMessage[] = [];
    for (const tc of lastMessage.tool_calls ?? []) {
      const t = toolsByName[tc.name];
      if (t) {
        console.log(`[SkillAgent] Executing tool: ${tc.name}`, tc.args);
        const result = await t.invoke(tc.args ?? {});
        const content = typeof result === "string" ? result : JSON.stringify(result);
        console.log(`[SkillAgent] Tool ${tc.name} result:`, content.slice(0, 200) + (content.length > 200 ? "..." : ""));
        toolMessages.push(
          new ToolMessage({ content, tool_call_id: tc.id ?? `call_${tc.name}` })
        );
      } else {
        console.warn(`[SkillAgent] Tool not found: ${tc.name}`);
      }
    }
    return { messages: toolMessages };
  };

  const shouldContinue = (state: { messages: BaseMessage[] }) => {
    const last = state.messages.at(-1);
    if (last && AIMessage.isInstance(last) && last.tool_calls?.length) {
      return "toolNode";
    }
    return END;
  };

  const workflow = new StateGraph(SkillAgentState)
    .addNode("agentNode", agentNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "agentNode")
    .addConditionalEdges("agentNode", shouldContinue, ["toolNode", END])
    .addEdge("toolNode", "agentNode");

  const graph = workflow.compile({
    checkpointer: memoryStore,
  });

  return graph;
}
