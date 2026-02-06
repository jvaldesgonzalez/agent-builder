"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import JavaScriptEditor from "../JavaScriptEditor";
import type { ToolParam } from "@/types";

interface AddToolModalProps {
  onClose: () => void;
  onSave: (name: string, description: string, code: string, params: ToolParam[]) => void;
}

export default function AddToolModal({ onClose, onSave }: AddToolModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [params, setParams] = useState<ToolParam[]>([]);
  const [code, setCode] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Generate default function code based on params
  const generateDefaultCode = useCallback((toolParams: ToolParam[]) => {
    const paramNames = toolParams.map(p => p.name).join(", ");
    return `function tool(${paramNames}) {\n  // Your code here\n  \n}`;
  }, []);

  // Track if user has manually edited the code
  const [userEditedCode, setUserEditedCode] = useState(false);

  // Update code when params change (only if user hasn't edited)
  useEffect(() => {
    if (!userEditedCode) {
      setCode(generateDefaultCode(params));
    }
  }, [params, generateDefaultCode, userEditedCode]);

  // Handle code change - mark as user edited
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setUserEditedCode(true);
  };

  // Add new parameter
  const handleAddParam = () => {
    const newParam: ToolParam = {
      id: `param-${Date.now()}`,
      name: `param${params.length + 1}`,
      description: "",
    };
    setParams([...params, newParam]);
  };

  // Remove parameter
  const handleRemoveParam = (paramId: string) => {
    setParams(params.filter(p => p.id !== paramId));
  };

  // Update parameter
  const handleUpdateParam = (paramId: string, field: "name" | "description", value: string) => {
    setParams(params.map(p =>
      p.id === paramId ? { ...p, [field]: value } : p
    ));
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim(), code, params);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-xl bg-white shadow-lg my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Tool</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-6 max-h-[70vh] overflow-y-auto">
          {/* Tool Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tool name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. generatePDF"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              autoFocus
            />
          </div>

          {/* Tool Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this tool does..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Parameters
              </label>
              <button
                onClick={handleAddParam}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus size={14} />
                Add parameter
              </button>
            </div>

            {params.length === 0 ? (
              <p className="text-xs text-gray-400">No parameters added yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {params.map((param) => (
                  <div key={param.id} className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => handleUpdateParam(param.id, "name", e.target.value)}
                        placeholder="Parameter name"
                        className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={param.description}
                        onChange={(e) => handleUpdateParam(param.id, "description", e.target.value)}
                        placeholder="Description"
                        className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveParam(param.id)}
                      className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JavaScript Code */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              JavaScript Code
            </label>
            <JavaScriptEditor
              value={code}
              onChange={handleCodeChange}
              placeholder="// Write your JavaScript code here..."
              minHeight="200px"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add tool
          </button>
        </div>
      </div>
    </div>
  );
}


