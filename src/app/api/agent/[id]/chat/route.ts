import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

        const flow = await prisma.flow.findUnique({
            where: { id },
        });

        if (!flow) {
            return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        }

        const flowData = {
            nodes: flow.nodes as unknown[],
            edges: flow.edges as unknown[],
            baseSystemPrompt: flow.baseSystemPrompt ?? undefined,
        };

        // Rebuild the graph and get the initial agent ID
        const { graph, initialAgentId } = await AgentFactory.createAgentGraph(
            id,
            flowData.nodes as Parameters<typeof AgentFactory.createAgentGraph>[1],
            flowData.edges as Parameters<typeof AgentFactory.createAgentGraph>[2],
            flowData.baseSystemPrompt
        );

        // Create configuration with thread_id for persistence
        // Use sessionId from client if available, otherwise fall back to flow ID (legacy/backup)
        const config = {
            configurable: {
                thread_id: sessionId || id
            }
        };

        // Get the thread state to check if currentAgent is already set
        const state = await graph.getState(config);

        const input = {
            messages: [new HumanMessage(message)],
            // Only set currentAgent on first message of a thread
            ...(state?.values?.currentAgent ? {} : { currentAgent: initialAgentId })
        };

        // Invoke with config to enable checkpointer
        const result = await graph.invoke(input, config);
        const lastMessage = result.messages[result.messages.length - 1];
        const responseText = typeof lastMessage.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);

        // Find the label of the current agent
        const currentAgentId = result.currentAgent;
        const nodes = flow.nodes as Array<{ id: string; data?: { label?: string } }>;
        const agentNode = nodes.find((n) => n.id === currentAgentId);
        const agentLabel = agentNode?.data?.label || currentAgentId;

        return NextResponse.json({ message: `[${agentLabel}]\n\n${responseText}` });
    } catch (error) {
        console.error("Chat error:", error);
        return NextResponse.json(
            { error: "Chat failed", details: String(error) },
            { status: 500 }
        );
    }
}
