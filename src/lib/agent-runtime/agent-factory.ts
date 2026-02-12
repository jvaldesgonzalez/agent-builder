import {
    StateGraph,
    StateSchema,
    MessagesValue,
    GraphNode,
    START,
    END,
} from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import * as z from "zod";
import { AppNode, AppEdge, AgentNodeData, KnowledgeBase, InfoCollectionItem, Tool } from "@/types";
import { memoryStore } from "./memory-store";

// System prompt constants
const DEFAULT_SYSTEM_PROMPT = "";

const TRANSFER_INSTRUCTIONS_PROMPT = "\n\n⚠️ CRITICAL TRANSFER RULE: When you need to transfer the conversation, call the appropriate transfer tool IMMEDIATELY and SILENTLY. DO NOT announce the transfer, DO NOT say things like 'I'm transferring you...', 'Let me connect you...', or 'I'll pass you to...'. Just execute the tool without any verbal announcement.";

const TRANSFER_CONTEXT_PROMPT = "[SYSTEM CONTEXT: You are now handling this conversation after a transfer from another agent. Speak to the user naturally, do not greet them and continue helping them. Do not mention the transfer.]";

// 1. Define Custom State Schema
const AgentState = new StateSchema({
    messages: MessagesValue,
    currentAgent: z.string().default(""),
});

// 2. Define Agent Configuration Structure
interface AgentConfig {
    id: string;
    label: string;
    systemPrompt: string;
    transferTools: StructuredToolInterface[]; // Tools to transfer to other agents/END
    
    // For future implementation (not used yet):
    knowledgeBases?: KnowledgeBase[];
    infoCollection?: InfoCollectionItem[];
    tools?: Tool[]; // Internal custom tools (from node.data.tools)
}

type AgentConfigMap = Record<string, AgentConfig>;

/**
 * Tool Types:
 * 1. TRANSFER TOOLS: Change currentAgent state (tracked in toolToAgentMap)
 * 2. NORMAL TOOLS: Execute logic, return results (no state change)
 * 
 * The agent will be bound with ALL tools: [...transferTools, ...normalTools]
 * The tool execution node knows which are transfers via toolToAgentMap
 */

interface TransferToolInfo {
    tool: StructuredToolInterface;
    targetAgentId: string; // "END" for end nodes, or agent node ID
}

// 3. Create Helper Functions
function findInitialAgent(nodes: AppNode[], edges: AppEdge[]): string {
    const startNode = nodes.find(n => n.type === "start");
    if (!startNode) throw new Error("No start node found");
    
    const startEdge = edges.find(e => e.source === startNode.id);
    if (!startEdge) throw new Error("No edge from start node");
    
    return startEdge.target;
}

function getAgentNodes(nodes: AppNode[]): AppNode[] {
    return nodes.filter(n => n.type === "agent");
}

function getOutgoingEdges(nodeId: string, edges: AppEdge[]): AppEdge[] {
    return edges.filter(e => e.source === nodeId);
}

// 4. Implement Transfer Tool Creation
function createTransferTools(
    agentNode: AppNode,
    outgoingEdges: AppEdge[],
    nodes: AppNode[]
): TransferToolInfo[] {
    const tools: TransferToolInfo[] = [];
    
    for (const edge of outgoingEdges) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) continue;
        
        // Skip tool dispatch nodes for now
        if (targetNode.type === "tool") continue;
        
        if (targetNode.type === "agent") {
            // Transfer to another agent
            const targetData = targetNode.data as AgentNodeData;
            const targetLabel = targetData.label;
            const toolName = `transfer_to_${targetLabel.toLowerCase().replace(/\s+/g, "_")}`;
            const description = edge.data?.conditionExpression || `Transfer conversation to ${targetLabel}`;
            
            const transferTool = tool(
                () => {
                    return `Transferred successfully to ${targetLabel}`;
                },
                {
                    name: toolName,
                    description: description,
                    schema: z.object({}), // No parameters needed
                }
            );
            
            tools.push({ tool: transferTool, targetAgentId: edge.target });
        } else if (targetNode.type === "end") {
            // Transfer to end (finish conversation)
            const description = (targetNode.data as any).description || "If the user says goodbye, end the conversation";
            const transferTool = tool(
                () => {
                    return "Conversation ended successfully";
                },
                {
                    name: "end_conversation",
                    description: description,
                    schema: z.object({}),
                }
            );
            
            tools.push({ tool: transferTool, targetAgentId: "END" });
        }
    }
    
    return tools;
}

// 5. Build Agent Configuration Map
function buildAgentConfigMap(
    nodes: AppNode[],
    edges: AppEdge[]
): { configMap: AgentConfigMap; toolToAgentMap: Record<string, string> } {
    const agentNodes = getAgentNodes(nodes);
    const configMap: AgentConfigMap = {};
    const toolToAgentMap: Record<string, string> = {}; // Maps tool name → target agent ID
    
    for (const agentNode of agentNodes) {
        const agentData = agentNode.data as AgentNodeData;
        const outgoingEdges = getOutgoingEdges(agentNode.id, edges);
        const transferToolInfos = createTransferTools(agentNode, outgoingEdges, nodes);
        
        // Map tool names to target agent IDs
        transferToolInfos.forEach(info => {
            toolToAgentMap[info.tool.name] = info.targetAgentId;
        });
        
        // Build system prompt with transfer instructions
        const basePrompt = agentData.conversationGoal || "You are a helpful assistant.";
        const transferInstructions = transferToolInfos.length > 0 
            ? TRANSFER_INSTRUCTIONS_PROMPT
            : "";
        
        configMap[agentNode.id] = {
            id: agentNode.id,
            label: agentData.label,
            systemPrompt: basePrompt + transferInstructions,
            transferTools: transferToolInfos.map(info => info.tool),
            
            // For future use (not implemented yet):
            knowledgeBases: agentData.knowledgeBases || [],
            infoCollection: agentData.infoCollection || [],
            tools: agentData.tools || [],
        };
    }
    
    return { configMap, toolToAgentMap };
}

// 6. Create Single Agent Node with Dynamic Behavior
function createDynamicAgentNode(
    configMap: AgentConfigMap,
    toolToAgentMap: Record<string, string>
): GraphNode<typeof AgentState> {
    let previousAgentId: string | null = null;
    
    return async (state) => {
        const currentAgentId = state.currentAgent;
        const config = configMap[currentAgentId];
        
        if (!config) {
            throw new Error(`Agent configuration not found for: ${currentAgentId}`);
        }
        
        // Check if we just transferred to this agent
        const justTransferred = previousAgentId !== null && previousAgentId !== currentAgentId;
        previousAgentId = currentAgentId;
        
        // Build system prompt with default prompt, optional transfer context, and agent prompt
        let systemPrompt = DEFAULT_SYSTEM_PROMPT;
        
        if (justTransferred) {
            systemPrompt += `${TRANSFER_CONTEXT_PROMPT}\n\n`;
        }
        
        systemPrompt += config.systemPrompt;
        
        // Filter messages to exclude transfer tool messages when just transferred
        // This prevents the agent from responding to transfer confirmations
        let messagesToSend = state.messages;
        if (justTransferred) {
            // Find the last AIMessage with tool_calls before this point
            // and check if any of those tool calls were transfer tools
            // If so, remove that AIMessage and the corresponding ToolMessages
            const messagesToFilter: Set<number> = new Set();
            
            for (let i = state.messages.length - 1; i >= 0; i--) {
                const msg = state.messages[i];
                
                // If we find a ToolMessage, check if it's from a transfer tool
                if (ToolMessage.isInstance(msg)) {
                    // Check if this tool message is from a transfer by looking at recent AI messages
                    const toolCallId = msg.tool_call_id;
                    
                    // Look backwards for the AIMessage that created this tool call
                    for (let j = i - 1; j >= 0; j--) {
                        const prevMsg = state.messages[j];
                        if (AIMessage.isInstance(prevMsg) && prevMsg.tool_calls) {
                            const matchingToolCall = prevMsg.tool_calls.find(tc => tc.id === toolCallId);
                            if (matchingToolCall) {
                                // Check if this tool is a transfer tool
                                if (toolToAgentMap[matchingToolCall.name]) {
                                    // This is a transfer tool message, mark it for filtering
                                    messagesToFilter.add(i);
                                    messagesToFilter.add(j); // Also filter the AI message that called it
                                }
                                break;
                            }
                        }
                    }
                }
            }
            
            // Filter out marked messages
            if (messagesToFilter.size > 0) {
                messagesToSend = state.messages.filter((_, idx) => !messagesToFilter.has(idx));
            }
        }
        
        // Create model
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
        });
        
        // Collect ALL tools for this agent (transfer + normal)
        const allTools = [...config.transferTools];
        
        // TODO: Add normal tools in the future
        // if (config.tools && config.tools.length > 0) {
        //   const langchainTools = config.tools.map(convertToLangChainTool);
        //   allTools.push(...langchainTools);
        // }
        
        // Bind all tools to model
        const modelWithTools = model.bindTools(allTools);
        
        // Call the model with system prompt and messages
        const response = await modelWithTools.invoke([
            new SystemMessage(systemPrompt),
            ...messagesToSend,
        ]);

        // Add the current agent to the response
        response.content += `\n\nCurrent agent: ${currentAgentId}`;
        
        return {
            messages: [response],
        };
    };
}

// 7. Create Tool Execution Node
function createToolExecutionNode(
    configMap: AgentConfigMap,
    toolToAgentMap: Record<string, string>
): GraphNode<typeof AgentState> {
    return async (state) => {
        const lastMessage = state.messages.at(-1);

        if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
            return { messages: [] };
        }

        const toolMessages: ToolMessage[] = [];
        let newCurrentAgent = state.currentAgent;

        // Get current agent config to access all tools (transfer + normal)
        const currentConfig = configMap[state.currentAgent];
        if (!currentConfig) {
            throw new Error(`Agent configuration not found: ${state.currentAgent}`);
        }
        
        // Create tool lookup by name
        // TODO: In the future, this will include both transferTools AND normal tools
        const toolsByName: Record<string, StructuredToolInterface> = {};
        
        // Add transfer tools
        currentConfig.transferTools.forEach(tool => {
            toolsByName[tool.name] = tool;
        });
        
        // TODO: Add normal tools (not implemented yet)
        // currentConfig.tools?.forEach(tool => {
        //   const langchainTool = convertToLangChainTool(tool);
        //   toolsByName[langchainTool.name] = langchainTool;
        // });

        // Execute tool calls
        for (const toolCall of lastMessage.tool_calls ?? []) {
            const tool = toolsByName[toolCall.name];
            
            if (tool) {
                // Execute the tool
                const observation = await tool.invoke(toolCall);
                
                // Create proper ToolMessage with tool_call_id
                const toolMessage = new ToolMessage({
                    content: String(observation),
                    tool_call_id: toolCall.id!, // Critical: must match the tool call ID
                });
                
                toolMessages.push(toolMessage);
                
                // Check if this is a TRANSFER tool (only transfer tools change currentAgent)
                const targetAgentId = toolToAgentMap[toolCall.name];
                if (targetAgentId) {
                    // This is a transfer tool - update currentAgent
                    newCurrentAgent = targetAgentId;
                    console.log(`🔄 Transfer: ${toolCall.name} → ${targetAgentId}`);
                }
                // If NOT a transfer tool, it's a normal tool - just execute and return result
            }
        }

        return {
            messages: toolMessages,
            currentAgent: newCurrentAgent, // Only changes if transfer tool was called
        };
    };
}

// 8. Create End Node
function createEndNode(): GraphNode<typeof AgentState> {
    return async (state) => {
        // Add a final system message
        return {
            messages: [new SystemMessage("Session finished. Thank you for using our service.")],
        };
    };
}

// 9. Implement Conditional Routing
const shouldContinueFromAgent = (state: typeof AgentState.State) => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return END;
    }

    if (lastMessage.tool_calls?.length) {
        return "toolNode";
    }

    return END;
};

const routeAfterTool = (state: typeof AgentState.State) => {
    if (state.currentAgent === "END") {
        return "endNode"; // Route to custom end node instead of END directly
    }
    return "agentNode"; // Loop back to agent with new currentAgent
};

// 10. Refactor createAgentGraph Method
export class AgentFactory {
    static async createAgentGraph(
        flowId: string,
        nodes: AppNode[],
        edges: AppEdge[]
    ) {
        // 1. Find the initial agent
        const initialAgentId = findInitialAgent(nodes, edges);
        
        // 2. Build agent configuration map
        const { configMap, toolToAgentMap } = buildAgentConfigMap(nodes, edges);
        
        // 3. Create the dynamic agent node
        const agentNode = createDynamicAgentNode(configMap, toolToAgentMap);
        
        // 4. Create the tool execution node
        const toolNode = createToolExecutionNode(configMap, toolToAgentMap);
        
        // 5. Create the end node
        const endNode = createEndNode();
        
        // 6. Build StateGraph
        const workflow = new StateGraph(AgentState)
            .addNode("agentNode", agentNode)
            .addNode("toolNode", toolNode)
            .addNode("endNode", endNode)
            // Connect START to agent node
            .addEdge(START, "agentNode")
            // Conditional routing from agent
            .addConditionalEdges("agentNode", shouldContinueFromAgent, ["toolNode", END])
            // Conditional routing from tool node
            .addConditionalEdges("toolNode", routeAfterTool, ["agentNode", "endNode"])
            // End node goes directly to END
            .addEdge("endNode", END);
        
        // 7. Compile with checkpointer
        const graph = workflow.compile({ 
            checkpointer: memoryStore,
        });
        
        // Return both the compiled graph and the initial agent ID
        return { graph, initialAgentId };
    }
}
