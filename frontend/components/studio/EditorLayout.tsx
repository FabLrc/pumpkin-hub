"use client";

import { NodePalette } from "./NodePalette";
import { StudioCanvas } from "./StudioCanvas";
import { PropertyPanel } from "./PropertyPanel";
import { Toolbar } from "./Toolbar";

export function EditorLayout() {
  return (
    <>
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <StudioCanvas />
        <PropertyPanel />
      </div>
    </>
  );
}
