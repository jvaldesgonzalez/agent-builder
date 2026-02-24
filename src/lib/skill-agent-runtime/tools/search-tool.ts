import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { initializeVectorStoreForFile, retrieveContextWithScores } from "./vector-search";
import path from "path";
import { existsSync } from "fs";

const vectorStoreCache: Record<string, Awaited<ReturnType<typeof initializeVectorStoreForFile>> | null> = {};

/**
 * Search tool: vector search on a specific file in the knowledge base.
 * File path is relative to public/ (e.g. "uploads/catalog.pdf")
 */
export const searchTool = tool(
  async ({ query, file }: { query: string; file: string }) => {
    if (!query || !file) {
      return "Error: Both query and file are required.";
    }

    const fullPath = path.join(process.cwd(), "public", file);
    if (!existsSync(fullPath)) {
      return `Error: File not found at ${file}. Please check the file path.`;
    }

    const cacheKey = file;
    if (!vectorStoreCache[cacheKey]) {
      try {
        vectorStoreCache[cacheKey] = await initializeVectorStoreForFile(fullPath);
      } catch (err) {
        console.error("Error initializing vector store:", err);
        return `Error loading file for search: ${String(err)}`;
      }
    }

    const store = vectorStoreCache[cacheKey];
    if (!store) {
      return "Error: Could not load the document for searching.";
    }

    const results = await retrieveContextWithScores(store, query, 4, 0.5);
    if (results.length === 0) {
      return `No relevant results found for query: "${query}"`;
    }

    return results.map((r, i) => `[${i + 1}] ${r.content}`).join("\n\n");
  },
  {
    name: "search",
    description: `Search for relevant information in a file (PDF, CSV, or text) using semantic search.
Provide the search query and the file path relative to public/ (e.g. "uploads/catalog.pdf").
Use this when you need to find information in documents, catalogs, or FAQ files.`,
    schema: z.object({
      query: z.string().describe("The search query to find relevant information"),
      file: z.string().describe("File path relative to public/ (e.g. uploads/catalog.pdf)"),
    }),
  }
);
