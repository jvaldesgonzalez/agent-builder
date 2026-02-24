import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

/**
 * Initialize a vector store from a single file path
 */
export async function initializeVectorStoreForFile(
  fullPath: string
): Promise<MemoryVectorStore | null> {
  const ext = fullPath.toLowerCase().split(".").pop();

  let loader;
  if (ext === "pdf") {
    loader = new PDFLoader(fullPath);
  } else if (ext === "csv") {
    loader = new CSVLoader(fullPath);
  } else {
    return null;
  }

  const docs = await loader.load();
  if (docs.length === 0) return null;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 128,
  });
  const splitDocs = await splitter.splitDocuments(docs);

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "models/gemini-embedding-001",
  });

  return MemoryVectorStore.fromDocuments(splitDocs, embeddings);
}

export async function retrieveContextWithScores(
  vectorStore: MemoryVectorStore,
  query: string,
  k: number = 4,
  similarityThreshold: number = 0.5
): Promise<Array<{ content: string; score: number }>> {
  const results = await vectorStore.similaritySearchWithScore(query, k);
  return results
    .filter(([, score]) => score >= similarityThreshold)
    .map(([doc, score]) => ({ content: doc.pageContent, score }));
}
