import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>MIT</Badge>);
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  it("applies default variant styles", () => {
    const { container } = render(<Badge>label</Badge>);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("text-text-dim");
  });

  it("applies orange variant styles", () => {
    const { container } = render(<Badge variant="orange">label</Badge>);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("text-accent");
  });

  it("applies green variant styles", () => {
    const { container } = render(<Badge variant="green">label</Badge>);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("text-success");
  });

  it("applies blue variant styles", () => {
    const { container } = render(<Badge variant="blue">label</Badge>);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("text-info");
  });

  it("appends custom className", () => {
    const { container } = render(<Badge className="custom-class">label</Badge>);
    const span = container.querySelector("span")!;
    expect(span.className).toContain("custom-class");
  });
});
