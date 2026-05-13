"use client";

import { NodePalette } from "./NodePalette";
import { StudioCanvas } from "./StudioCanvas";
import { PropertyPanel } from "./PropertyPanel";
import { Toolbar } from "./Toolbar";
import { StudioErrorBoundary } from "./ErrorBoundary";

export function EditorLayout() {
  return (
    <>
      <Toolbar />
      <StudioErrorBoundary>
        <div className="flex flex-1 overflow-hidden">
          <NodePalette />
          <StudioCanvas />
          <PropertyPanel />
        </div>
      </StudioErrorBoundary>
    </>
  );
}
