import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { GithubWorkflowPreview } from "./GithubWorkflowPreview";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GithubWorkflowPreview", () => {
  it("renders workflow label", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<GithubWorkflowPreview active />);
    expect(screen.getByLabelText("GitHub auto-publish workflow animation")).toBeInTheDocument();
  });

  it("renders developer station when active", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<GithubWorkflowPreview active />);
    expect(screen.getByText("developer")).toBeInTheDocument();
  });

  it("renders GitHub Actions station when active", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<GithubWorkflowPreview active />);
    expect(screen.getByText("github actions")).toBeInTheDocument();
  });

  it("renders pumpkin hub station when active", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<GithubWorkflowPreview active />);
    expect(screen.getByText("pumpkin hub")).toBeInTheDocument();
  });

  it("renders idle when not active", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<GithubWorkflowPreview active={false} />);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });
});
