import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const flowData = await request.json();
        const { id, name, nodes, edges, baseSystemPrompt } = flowData;

        if (!id || !name) {
            return NextResponse.json(
                { error: "Flow ID and name are required" },
                { status: 400 }
            );
        }

        await prisma.flow.upsert({
            where: { id },
            create: {
                id,
                name,
                nodes: nodes ?? [],
                edges: edges ?? [],
                baseSystemPrompt: baseSystemPrompt ?? null,
            },
            update: {
                name,
                nodes: nodes ?? [],
                edges: edges ?? [],
                baseSystemPrompt: baseSystemPrompt ?? null,
            },
        });

        return NextResponse.json({ success: true, flowId: id });
    } catch (error) {
        console.error("Error saving flow:", error);
        return NextResponse.json(
            { error: "Failed to save flow" },
            { status: 500 }
        );
    }
}
