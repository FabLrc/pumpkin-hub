"use client";

import { NodePalette } from "./NodePalette";
import { StudioCanvas } from "./StudioCanvas";
import { PropertyPanel } from "./PropertyPanel";
import { Toolbar } from "./Toolbar";
import { BuildStatus } from "./BuildStatus";
import { StudioErrorBoundary } from "./ErrorBoundary";

export function EditorLayout() {
  return (
    <>
      <Toolbar />
      <StudioErrorBoundary>
        <div className="flex flex-1 overflow-hidden relative">
          <NodePalette />
          <StudioCanvas />
          <PropertyPanel />
          <BuildStatus />
        </div>
      </StudioErrorBoundary>
    </>
  );
}
