import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AgentFactory } from "@/lib/agent-runtime/agent-factory";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const flow = await prisma.flow.findUnique({
            where: { id },
        });

        if (!flow) {
            return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        }

        // Verify we can build the graph
        await AgentFactory.createAgentGraph(
            id,
            flow.nodes as unknown[],
            flow.edges as unknown[],
            flow.baseSystemPrompt ?? undefined
        );

        return NextResponse.json({ success: true, message: `Agent compiled successfully` });
    } catch (error) {
        console.error("Compilation error:", error);
        return NextResponse.json(
            { error: "Compilation failed", details: String(error) },
            { status: 500 }
        );
    }
}
