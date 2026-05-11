import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentlyPublishedSection } from "./RecentlyPublishedSection";

const usePluginsMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  usePlugins: (...args: unknown[]) => usePluginsMock(...args),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

describe("RecentlyPublishedSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when isLoading", () => {
    usePluginsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    render(<RecentlyPublishedSection />);
    expect(screen.getByText("Recently Published")).toBeInTheDocument();
  });

  it("renders error state when fetch fails", () => {
    usePluginsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("API Error"),
    });
    render(<RecentlyPublishedSection />);
    expect(screen.getByText("Recently Published")).toBeInTheDocument();
    expect(
      screen.getByText("Could not load recently published plugins."),
    ).toBeInTheDocument();
  });

  it("returns null when no plugins and not loading", () => {
    usePluginsMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: undefined,
    });
    const { container } = render(<RecentlyPublishedSection />);
    expect(container.innerHTML).toBe("");
  });
});
