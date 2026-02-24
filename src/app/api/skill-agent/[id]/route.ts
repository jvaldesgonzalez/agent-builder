import { NextRequest, NextResponse } from "next/server";
import { getSkillAgent, saveSkillAgent, deleteSkillAgent } from "@/lib/skill-agent-runtime/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getSkillAgent(id);
    if (!agent) {
      return NextResponse.json({ error: "Skill agent not found" }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error) {
    console.error("Get skill agent error:", error);
    return NextResponse.json(
      { error: "Failed to get skill agent" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getSkillAgent(id);
    if (!existing) {
      return NextResponse.json({ error: "Skill agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const updated = {
      ...existing,
      name: body.name ?? existing.name,
      basePrompt: body.basePrompt ?? existing.basePrompt,
      skills: body.skills ?? existing.skills,
    };
    await saveSkillAgent(updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update skill agent error:", error);
    return NextResponse.json(
      { error: "Failed to update skill agent" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteSkillAgent(id);
    if (!deleted) {
      return NextResponse.json({ error: "Skill agent not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete skill agent error:", error);
    return NextResponse.json(
      { error: "Failed to delete skill agent" },
      { status: 500 }
    );
  }
}
