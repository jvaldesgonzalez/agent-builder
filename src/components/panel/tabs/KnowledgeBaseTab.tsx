"use client";

import React, { useState, useRef, useEffect } from "react";
import { Book, Trash2, Search, FileText } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import type { AgentNodeData, KnowledgeBase } from "@/types";
import { MOCK_KNOWLEDGE_BASES } from "@/lib/mockData";

export default function KnowledgeBaseTab() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const addKnowledgeBaseToNode = useFlowStore((s) => s.addKnowledgeBaseToNode);
  const removeKnowledgeBaseFromNode = useFlowStore((s) => s.removeKnowledgeBaseFromNode);

  const [showKBList, setShowKBList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setShowKBList(false);
        setSearchTerm("");
      }
    }
    if (showKBList) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showKBList]);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const data = node.data as unknown as AgentNodeData;
  const addedKBs = data.knowledgeBases || [];
  const addedKBIds = new Set(addedKBs.map(kb => kb.id));

  // Filter mock data based on search and exclude already added KBs
  const filteredKBs = MOCK_KNOWLEDGE_BASES.filter(
    (kb) =>
      !addedKBIds.has(kb.id) &&
      kb.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddKB = (kb: KnowledgeBase) => {
    addKnowledgeBaseToNode(node.id, kb);
    setSearchTerm(""); // Clear search after adding
  };

  const handleRemoveKB = (kbId: string) => {
    removeKnowledgeBaseFromNode(node.id, kbId);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Add knowledge base button */}
      <div className="relative">
        <button
          onClick={() => setShowKBList(!showKBList)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Add knowledge base
        </button>

        {/* Floating knowledge base list dropdown */}
        {showKBList && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-50 mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white shadow-lg p-3"
          >
            {/* Search input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents..."
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                autoFocus
              />
            </div>

            {/* Available knowledge bases list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredKBs.length > 0 ? (
                filteredKBs.map((kb) => (
                  <button
                    key={kb.id}
                    onClick={() => handleAddKB(kb)}
                    className="w-full flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-200 p-2 text-left hover:bg-gray-100 transition-colors"
                  >
                    <FileText size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {kb.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {kb.description}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-gray-400">
                  {searchTerm ? "No knowledge bases found" : "All knowledge bases added"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Added knowledge bases */}
      {addedKBs.length > 0 && (
        <div className="flex flex-col gap-2">
          {addedKBs.map((kb) => (
            <div
              key={kb.id}
              className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Book size={16} className="text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {kb.name}
                </h4>
                <p className="mt-0.5 text-xs text-gray-400 truncate">
                  {kb.description}
                </p>
              </div>
              <button
                onClick={() => handleRemoveKB(kb.id)}
                className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {addedKBs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Book size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400">No knowledge bases added yet</p>
          <p className="text-xs text-gray-300">
            Click "Add knowledge base" to link documents
          </p>
        </div>
      )}
    </div>
  );
}
