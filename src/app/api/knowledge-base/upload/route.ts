import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { csvParse } from "d3-dsv";

async function extractTextFromBuffer(
    buffer: Buffer,
    type: string
): Promise<string> {
    const ext = type.toLowerCase();
    if (ext === "pdf") {
        const pdf = (await import("pdf-parse")).default;
        const data = await pdf(buffer);
        return data.text ?? "";
    }
    if (ext === "csv") {
        const str = buffer.toString("utf-8");
        const rows = csvParse(str);
        return rows.length > 0
            ? rows.map((row) => Object.values(row).join(" | ")).join("\n")
            : str;
    }
    if (ext === "txt" || ext === "text") {
        return buffer.toString("utf-8");
    }
    return buffer.toString("utf-8");
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const originalName = file.name;
        const extension = (originalName.split(".").pop() ?? "txt").toLowerCase();
        const allowedTypes = ["pdf", "csv", "txt", "text"];
        const type = allowedTypes.includes(extension) ? extension : "txt";

        const content = await extractTextFromBuffer(buffer, type);

        const id = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const uploadDate = new Date();

        await prisma.knowledgeBase.create({
            data: {
                id,
                name: originalName,
                description: `Uploaded: ${uploadDate.toLocaleDateString()}`,
                type,
                content,
                fileSize: file.size,
                uploadDate,
            },
        });

        const fileMetadata = {
            id,
            name: originalName,
            description: `Uploaded: ${uploadDate.toLocaleDateString()}`,
            type,
            uploadDate: uploadDate.toISOString(),
            fileSize: file.size,
        };

        return NextResponse.json(fileMetadata);
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}
