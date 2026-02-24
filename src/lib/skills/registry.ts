import type { Skill } from "@/types/skill-agent";

/** Built-in tool names */
export const TOOL_NAMES = {
  search: "search",
  check_time_slots: "check_time_slots",
  schedule_event: "schedule_event",
} as const;

/** Registry of built-in skills */
export const BUILT_IN_SKILLS: Skill[] = [
  {
    id: "search_catalog",
    name: "Search in Catalog",
    description:
      "Search within a product catalog or document for information. Use when the user asks about products, prices, or catalog contents.",
    content: `# Search in Catalog Skill

Use the search tool to find relevant information in the configured catalog file.
- MANDATORY: You MUST call the search tool every time the user asks about products, prices, or anything related to the catalog. Never rely on your internal memory or previous turns for catalog information, as it is highly variable.
- Query Generation: Create a comprehensive search query by analyzing the entire conversation history to capture the full context of the user's intent.
- Keyword Optimization: Include specific keywords, product names, model numbers, or categories in your search query to improve retrieval accuracy.
- Combine multiple search results if needed to answer comprehensively.
- Cite the source when possible.`,
    toolNames: [TOOL_NAMES.search],
    params: [
      {
        key: "file",
        label: "Catalog file",
        description: "Path to the file to search (relative to public/)",
        required: true,
        type: "file",
      },
    ],
  },
  {
    id: "schedule_appointment",
    name: "Schedule an Appointment",
    description:
      "Check available time slots and schedule appointments. Use when the user wants to book, reschedule, or check availability.",
    content: `# Schedule Appointment Skill

1. First call check_time_slots with the requested date to see availability
2. Present options to the user
3. When the user confirms, call schedule_event with date and email
4. Confirm the booking to the user`,
    toolNames: [TOOL_NAMES.check_time_slots, TOOL_NAMES.schedule_event],
    params: [],
  },
  {
    id: "answer_faqs",
    name: "Answer FAQs",
    description:
      "Answer frequently asked questions from a knowledge base. Use when the user asks general questions that may be in the FAQ document.",
    content: `# Answer FAQs Skill

Use the search tool to find answers to common questions.
- Query the FAQ document with the user's question
- Return concise, helpful answers
- If no relevant result is found, say so and offer alternatives`,
    toolNames: [TOOL_NAMES.search],
    params: [
      {
        key: "file",
        label: "FAQ file",
        description: "Path to the FAQ document (relative to public/)",
        required: false,
        type: "file",
      },
    ],
  },
];

/** Get skill by ID */
export function getSkillById(id: string): Skill | undefined {
  return BUILT_IN_SKILLS.find((s) => s.id === id);
}

/** Get all skill IDs */
export function getAllSkillIds(): string[] {
  return BUILT_IN_SKILLS.map((s) => s.id);
}
