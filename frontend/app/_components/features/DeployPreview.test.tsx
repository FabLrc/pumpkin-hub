import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeployPreview } from "./DeployPreview";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeployPreview", () => {
  it("renders verify label", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeployPreview />);
    expect(screen.getByText("// pre-publication checks")).toBeInTheDocument();
  });

  it("renders SHA-256 check row", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeployPreview />);
    expect(screen.getByText("SHA-256 verified")).toBeInTheDocument();
  });

  it("renders vulnerability scan row", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeployPreview />);
    expect(screen.getByText("Vulnerability scan passed")).toBeInTheDocument();
  });

  it("renders cross-platform row", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeployPreview />);
    expect(screen.getByText("Cross-platform .wasm ready")).toBeInTheDocument();
  });

  it("renders trust section", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeployPreview />);
    expect(screen.getByText("// trust")).toBeInTheDocument();
  });
});
