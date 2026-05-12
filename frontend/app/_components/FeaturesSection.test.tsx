import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesSection } from "./FeaturesSection";

describe("FeaturesSection", () => {
  it("renders the 'Why Pumpkin Hub' heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Why Pumpkin Hub")).toBeInTheDocument();
  });

  it("renders the 'Powered by Pumpkin' sub-heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Powered by Pumpkin")).toBeInTheDocument();
  });

  it("renders the 'Built for Server Admins' sub-heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Built for Server Admins")).toBeInTheDocument();
  });

  it("shows Pumpkin performance stats", () => {
    render(<FeaturesSection />);
    expect(screen.getAllByText("~5ms").length).toBeGreaterThan(0);
    expect(screen.getAllByText("~100MB").length).toBeGreaterThan(0);
  });

  it("renders comparison table with metrics", () => {
    render(<FeaturesSection />);
    expect(screen.getAllByText("Pumpkin").length).toBeGreaterThan(0);
    expect(screen.getByText("Paper")).toBeInTheDocument();
    expect(screen.getByText("Vanilla")).toBeInTheDocument();
  });

  it("renders all 3 admin feature cards", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Server Builder")).toBeInTheDocument();
    expect(screen.getByText("GitHub Auto-Publishing")).toBeInTheDocument();
    expect(screen.getByText("WASM Everywhere")).toBeInTheDocument();
  });
});
