import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesSection } from "./FeaturesSection";

beforeAll(() => {
  if (!("IntersectionObserver" in globalThis)) {
    class MockIO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    (globalThis as unknown as { IntersectionObserver: typeof MockIO }).IntersectionObserver = MockIO;
  }
});

describe("FeaturesSection", () => {
  it("renders the 'Why Pumpkin Hub' eyebrow", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Why Pumpkin Hub")).toBeInTheDocument();
  });

  it("renders the 'Powered by Pumpkin' heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Powered by Pumpkin")).toBeInTheDocument();
  });

  it("renders the 'Built for Server Admins' heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Built for Server Admins")).toBeInTheDocument();
  });

  it("shows Pumpkin performance stats", () => {
    render(<FeaturesSection />);
    expect(screen.getAllByText("~5ms").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/~100MB/).length).toBeGreaterThan(0);
  });

  it("renders comparison metrics across the three engines", () => {
    render(<FeaturesSection />);
    expect(screen.getAllByText("Pumpkin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paper").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vanilla").length).toBeGreaterThan(0);
  });

  it("renders all 3 admin workflow steps", () => {
    render(<FeaturesSection />);
    expect(screen.getAllByText("Server Builder").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GitHub Auto-Publishing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("WASM Everywhere").length).toBeGreaterThan(0);
  });
});
