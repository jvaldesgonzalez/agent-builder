import { NextResponse } from "next/server";
import { getSkillAgent } from "@/lib/skill-agent-runtime/storage";
import { createSkillAgentGraph } from "@/lib/skill-agent-runtime/agent-runtime";
import { HumanMessage, AIMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, sessionId } = body;

    const agent = await getSkillAgent(id);
    if (!agent) {
      return NextResponse.json({ error: "Skill agent not found" }, { status: 404 });
    }

    const graph = await createSkillAgentGraph(agent);
    const config = {
      configurable: { thread_id: sessionId ?? id },
    };

    const input = { messages: [new HumanMessage(message)] };
    const result = await graph.invoke(input, config);
    
    // Find all new messages (after the input HumanMessage)
    const allMessages = result.messages as BaseMessage[];
    const inputMsgIndex = allMessages.findLastIndex(m => HumanMessage.isInstance(m) && m.content === message);
    const newMessages = allMessages.slice(inputMsgIndex + 1);

    const formattedMessages = newMessages.map(msg => {
      if (AIMessage.isInstance(msg)) {
        return { role: "agent", content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) };
      }
      if (ToolMessage.isInstance(msg) && msg.content.startsWith("Loaded skill:")) {
        // Extract the skill name from "Loaded skill: Name\n\nContent"
        const skillName = msg.content.split("\n")[0].replace("Loaded skill: ", "");
        return { role: "system", content: `Skill loaded: ${skillName}` };
      }
      return null;
    }).filter(m => m !== null && m.content !== "");

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Skill agent chat error:", error);
    return NextResponse.json(
      { error: "Chat failed", details: String(error) },
      { status: 500 }
    );
  }
}
