import { NextRequest, NextResponse } from "next/server";
import { listSkillAgents, saveSkillAgent, createNewSkillAgent } from "@/lib/skill-agent-runtime/storage";

export async function GET() {
  try {
    const agents = await listSkillAgents();
    return NextResponse.json(agents);
  } catch (error) {
    console.error("List skill agents error:", error);
    return NextResponse.json(
      { error: "Failed to list skill agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, basePrompt } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const agent = createNewSkillAgent(name, basePrompt ?? "");
    await saveSkillAgent(agent);
    return NextResponse.json(agent);
  } catch (error) {
    console.error("Create skill agent error:", error);
    return NextResponse.json(
      { error: "Failed to create skill agent" },
      { status: 500 }
    );
  }
}
