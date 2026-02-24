import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { KnowledgeBase } from "@/types";
import { prisma } from "@/lib/prisma";

/**
 * Initialize a vector store from an agent's knowledge bases.
 * Fetches document content from the database (no local files).
 */
export async function initializeVectorStore(
    knowledgeBases: KnowledgeBase[]
): Promise<MemoryVectorStore | null> {
    if (!knowledgeBases || knowledgeBases.length === 0) {
        return null;
    }

    const ids = knowledgeBases.map((kb) => kb.id);
    const records = await prisma.knowledgeBase.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, content: true },
    });

    const allDocuments: Document[] = [];

    for (const record of records) {
        if (!record.content || record.content.trim() === "") {
            console.warn(`⚠️ Knowledge base ${record.name} has no content, skipping`);
            continue;
        }

        const doc = new Document({
            pageContent: record.content,
            metadata: {
                knowledgeBaseId: record.id,
                knowledgeBaseName: record.name,
            },
        });
        allDocuments.push(doc);
        console.log(`✅ Loaded content from ${record.name}`);
    }

    if (allDocuments.length === 0) {
        console.warn("⚠️ No documents loaded from knowledge bases");
        return null;
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 128,
    });

    const splitDocs = await textSplitter.splitDocuments(allDocuments);
    console.log(`📄 Split into ${splitDocs.length} chunks`);

    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "models/gemini-embedding-001",
    });

    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings
    );

    console.log(`🗄️ Vector store initialized with ${splitDocs.length} chunks`);

    return vectorStore;
}

/**
 * Retrieve relevant context with similarity scores
 * Returns chunks that meet the similarity threshold
 */
export async function retrieveContextWithScores(
    vectorStore: MemoryVectorStore,
    query: string,
    k: number = 4,
    similarityThreshold: number = 0.7
): Promise<Array<{ content: string; score: number }>> {
    try {
        const results = await vectorStore.similaritySearchWithScore(query, k);

        const filteredResults = results
            .filter(([_doc, score]) => score >= similarityThreshold)
            .map(([doc, score]) => ({
                content: doc.pageContent,
                score: score,
            }));

        console.log(
            `🔍 Retrieved ${filteredResults.length}/${results.length} chunks above threshold ${similarityThreshold}`
        );

        return filteredResults;
    } catch (error) {
        console.error("❌ Error retrieving context:", error);
        return [];
    }
}
