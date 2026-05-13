"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { CanvasContent } from "./CanvasContent";

export function StudioCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
