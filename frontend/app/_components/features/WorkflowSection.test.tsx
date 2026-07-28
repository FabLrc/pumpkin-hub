import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkflowSection } from "./WorkflowSection";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WorkflowSection", () => {
  it("renders the heading", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<WorkflowSection />);
    expect(screen.getByText("Built for Server Admins")).toBeInTheDocument();
  });

  it("renders all three step titles", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<WorkflowSection />);
    expect(screen.getAllByText("Server Builder").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GitHub Auto-Publishing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("WASM Everywhere").length).toBeGreaterThan(0);
  });

  it("renders all three eyebrow labels", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<WorkflowSection />);
    expect(screen.getAllByText("// discover").length).toBeGreaterThan(0);
    expect(screen.getAllByText("// publish").length).toBeGreaterThan(0);
    expect(screen.getAllByText("// trust").length).toBeGreaterThan(0);
  });

  it("renders section eyebrow", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<WorkflowSection />);
    expect(screen.getByText("// 02 — the workflow")).toBeInTheDocument();
  });

  it("renders the section description", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<WorkflowSection />);
    expect(screen.getByText(/Discover, publish, and trust plugins/)).toBeInTheDocument();
  });
});
