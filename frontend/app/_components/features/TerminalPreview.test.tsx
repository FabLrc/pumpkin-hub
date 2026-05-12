import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalPreview } from "./TerminalPreview";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TerminalPreview", () => {
  it("renders terminal output label", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<TerminalPreview active />);
    expect(screen.getByLabelText("Terminal output preview")).toBeInTheDocument();
  });
});
