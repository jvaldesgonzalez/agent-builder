import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const flow = await prisma.flow.findUnique({
            where: { id },
        });

        if (!flow) {
            return NextResponse.json(
                { error: "Flow not found" },
                { status: 404 }
            );
        }

        const flowData = {
            id: flow.id,
            name: flow.name,
            nodes: flow.nodes as unknown[],
            edges: flow.edges as unknown[],
            baseSystemPrompt: flow.baseSystemPrompt ?? undefined,
            updatedAt: flow.updatedAt.toISOString(),
        };

        return NextResponse.json(flowData);
    } catch (error) {
        console.error("Error loading flow:", error);
        return NextResponse.json(
            { error: "Failed to load flow" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const flow = await prisma.flow.findUnique({
            where: { id },
        });

        if (!flow) {
            return NextResponse.json(
                { error: "Flow not found" },
                { status: 404 }
            );
        }

        await prisma.flow.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting flow:", error);
        return NextResponse.json(
            { error: "Failed to delete flow" },
            { status: 500 }
        );
    }
}
