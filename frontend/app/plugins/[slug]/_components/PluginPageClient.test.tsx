import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginPageClient } from "./PluginPageClient";
import type { PluginResponse } from "@/lib/types";

const mockPlugin: PluginResponse = {
  id: "p1",
  name: "Test Plugin",
  slug: "test-plugin",
  short_description: "A great test plugin",
  description: "Full description here",
  author: { id: "a1", username: "testuser", avatar_url: null },
  repository_url: "https://github.com/test/repo",
  documentation_url: "https://docs.example.com",
  license: "MIT",
  downloads_total: 5000,
  categories: [{ id: "c1", name: "Security", slug: "security" }],
  average_rating: 4.5,
  review_count: 10,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

const usePluginMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  usePlugin: (...args: unknown[]) => usePluginMock(...args),
}));

vi.mock("./PluginHeader", () => ({
  PluginHeader: ({ plugin }: { plugin: PluginResponse }) => (
    <div data-testid="plugin-header">{plugin.name}</div>
  ),
}));

vi.mock("./PluginContent", () => ({
  PluginContent: ({ plugin }: { plugin: PluginResponse }) => (
    <div data-testid="plugin-content">{plugin.name}</div>
  ),
}));

vi.mock("./PluginSidebar", () => ({
  PluginSidebar: ({ plugin }: { plugin: PluginResponse }) => (
    <div data-testid="plugin-sidebar">{plugin.name}</div>
  ),
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

describe("PluginPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton when isLoading", () => {
    usePluginMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { container } = render(<PluginPageClient slug="test-plugin" />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows error state when error", () => {
    usePluginMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Not found"),
    });

    render(<PluginPageClient slug="test-plugin" />);
    expect(screen.getByText("Plugin not found")).toBeInTheDocument();
  });

  it("renders Navbar, PluginHeader, PluginContent, PluginSidebar when loaded", () => {
    usePluginMock.mockReturnValue({
      data: mockPlugin,
      isLoading: false,
      error: undefined,
    });

    render(<PluginPageClient slug="test-plugin" />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("plugin-header")).toBeInTheDocument();
    expect(screen.getByTestId("plugin-content")).toBeInTheDocument();
    expect(screen.getByTestId("plugin-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("error state shows plugin slug in message", () => {
    usePluginMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Not found"),
    });

    render(<PluginPageClient slug="test-plugin" />);
    expect(screen.getByText(/test-plugin/)).toBeInTheDocument();
  });
});
