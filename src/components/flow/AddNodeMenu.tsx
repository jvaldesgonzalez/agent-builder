"use client";

import React, { useEffect, useRef } from "react";
import { Bot, Wrench, Scissors } from "lucide-react";
import { AgentNodeType } from "@/types";
import { useFlowStore } from "@/store/flowStore";

interface AddNodeMenuProps {
  parentId: string;
  onClose: () => void;
}

const menuItems = [
  {
    type: AgentNodeType.Agent,
    label: "Agent",
    icon: Bot,
    description: "Add a conversational agent",
  },
  {
    type: AgentNodeType.Tool,
    label: "Tool dispatch",
    icon: Wrench,
    description: "Dispatch to different tools",
  },
  {
    type: AgentNodeType.End,
    label: "End",
    icon: Scissors,
    description: "End the conversation",
  },
];

export default function AddNodeMenu({ parentId, onClose }: AddNodeMenuProps) {
  const addChildNode = useFlowStore((s) => s.addChildNode);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }
    // Use capture phase to handle click before other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl bg-white border border-gray-200 shadow-lg p-1 min-w-[200px] nodrag nopan"
    >
      {menuItems.map((item) => (
        <button
          key={item.type}
          onClick={(e) => {
            e.stopPropagation();
            addChildNode(parentId, item.type);
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
            <item.icon size={16} className="text-gray-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">
              {item.label}
            </div>
            <div className="text-xs text-gray-400">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
