import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { AgentFactory } from "@/lib/agent-runtime/agent-factory";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { message, sessionId } = body;

        const flowsDir = path.join(process.cwd(), "public", "flows");
        const filePath = path.join(flowsDir, `${id}.json`);

        if (!existsSync(filePath)) {
            return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        }

        const fileContent = await readFile(filePath, "utf8");
        const flowData = JSON.parse(fileContent);

        // Rebuild the graph (stateless for this demo)
        const graph = await AgentFactory.createAgentGraph(id, flowData.nodes, flowData.edges);

        // Create configuration with thread_id for persistence
        // Use sessionId from client if available, otherwise fall back to flow ID (legacy/backup)
        const config = {
            configurable: {
                thread_id: sessionId || id
            }
        };

        const input = {
            messages: [new HumanMessage(message)]
        };

        // Invoke with config to enable checkpointer
        const result = await graph.invoke(input, config);
        const lastMessage = result.messages[result.messages.length - 1];
        const responseText = typeof lastMessage.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);

        return NextResponse.json({ message: responseText });
    } catch (error) {
        console.error("Chat error:", error);
        return NextResponse.json(
            { error: "Chat failed", details: String(error) },
            { status: 500 }
        );
    }
}
