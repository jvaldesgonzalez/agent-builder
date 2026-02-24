import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const files = await prisma.knowledgeBase.findMany({
            orderBy: { uploadDate: "desc" },
            select: {
                id: true,
                name: true,
                description: true,
                type: true,
                fileSize: true,
                uploadDate: true,
            },
        });

        const fileMetadata = files.map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description ?? `Uploaded: ${f.uploadDate.toLocaleDateString()}`,
            type: f.type,
            fileSize: f.fileSize,
            uploadDate: f.uploadDate.toISOString(),
        }));

        return NextResponse.json(fileMetadata);
    } catch (error) {
        console.error("Error listing files:", error);
        return NextResponse.json(
            { error: "Failed to list files" },
            { status: 500 }
        );
    }
}
