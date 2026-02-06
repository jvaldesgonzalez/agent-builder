"use client";

import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import AgentBuilderCanvas from "@/components/flow/AgentBuilderCanvas";
import ConfigPanel from "@/components/panel/ConfigPanel";

export default function Home() {
  return (
    <ReactFlowProvider>
      <div className="flex h-screen overflow-hidden">
        <div className="flex-1">
          <AgentBuilderCanvas />
        </div>
        <ConfigPanel />
      </div>
    </ReactFlowProvider>
  );
}
