import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const flows = await prisma.flow.findMany({
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                name: true,
                updatedAt: true,
                nodes: true,
            },
        });

        const list = flows.map((f) => ({
            id: f.id,
            name: f.name,
            updatedAt: f.updatedAt.toISOString(),
            nodeCount: Array.isArray(f.nodes) ? f.nodes.length : 0,
        }));

        return NextResponse.json(list);
    } catch (error) {
        console.error("Error listing flows:", error);
        return NextResponse.json(
            { error: "Failed to list flows" },
            { status: 500 }
        );
    }
}
