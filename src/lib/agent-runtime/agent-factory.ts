import {
    StateGraph,
    MessagesAnnotation,
    START,
    END,
} from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { AppNode, AppEdge, AgentNodeData } from "@/types";
import { memoryStore } from "./memory-store";

export class AgentFactory {
    // Method to create a graph from nodes and edges
    static async createAgentGraph(
        _flowId: string, // Placeholder for future usage
        nodes: AppNode[],
        _edges: AppEdge[] // Placeholder for future usage (routing logic)
    ) {
        // 1. Find the Agent Node (simplified for single-agent flow)
        const agentNode = nodes.find((n) => n.type === "agent");

        if (!agentNode) {
            throw new Error("No Agent node found in the flow.");
        }

        const agentData = agentNode.data as AgentNodeData;
        const systemPrompt = agentData.conversationGoal || "You are a helpful assistant.";

        // 2. Initialize Model
        // We assume GOOGLE_API_KEY is set in environment variables
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash", // Using 2.5 Flash as standard reliable flash model
        });

        // 3. Define Graph Nodes

        // Node: Call Model
        const callModel = async (state: typeof MessagesAnnotation.State) => {
            const messages = state.messages;

            const response = await model.invoke([
                new SystemMessage(systemPrompt),
                ...messages,
            ]);

            return { messages: [response] };
        };

        // 4. Build Graph
        const workflow = new StateGraph(MessagesAnnotation)
            // Add nodes
            .addNode("agent", callModel)
            // Add edges (Simple linear: Start -> Agent -> End)
            .addEdge(START, "agent")
            .addEdge("agent", END);

        // 5. Compile with Checkpointer
        // We use the singleton memoryStore
        return workflow.compile({ checkpointer: memoryStore });
    }
}

