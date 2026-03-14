import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesSection } from "./FeaturesSection";

describe("FeaturesSection", () => {
  it("renders the 'Why Pumpkin Hub' heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Why Pumpkin Hub")).toBeInTheDocument();
  });

  it("renders all 3 feature headings", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Zero-Cost Abstractions")).toBeInTheDocument();
    expect(screen.getByText("Binary Verification")).toBeInTheDocument();
    expect(screen.getByText("Cross-Architecture")).toBeInTheDocument();
  });

  it("shows performance stats", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("0.8ms")).toBeInTheDocument();
    expect(screen.getByText("12x faster")).toBeInTheDocument();
  });

  it("shows architecture support grid", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("x86_64")).toBeInTheDocument();
    expect(screen.getByText("aarch64")).toBeInTheDocument();
    expect(screen.getByText("RISC-V")).toBeInTheDocument();
    expect(screen.getByText("WASM")).toBeInTheDocument();
  });

  it("shows verify command example", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("# Verify a download")).toBeInTheDocument();
  });
});
