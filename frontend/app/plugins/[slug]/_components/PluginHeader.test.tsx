import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { PluginHeader } from "./PluginHeader";
import type { PluginResponse } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/plugins/PluginActions", () => ({
  PluginActions: ({ plugin }: { plugin: PluginResponse }) => (
    <div data-testid="plugin-actions">{plugin.slug}</div>
  ),
}));

vi.mock("@/components/ui", () => ({
  Badge: ({ children, variant }: { children: ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
  PluginIcon: ({ pluginName }: { pluginName: string }) => (
    <div data-testid="plugin-icon">{pluginName}</div>
  ),
}));

const mockPlugin: PluginResponse = {
  id: "p1",
  name: "Test Plugin",
  slug: "test-plugin",
  short_description: "A great test plugin",
  icon_url: null,
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

describe("PluginHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders plugin name as h1", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Test Plugin" }),
    ).toBeInTheDocument();
  });

  it("renders author link to /users/testuser", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    const authorLink = screen.getByRole("link", { name: "testuser" });
    expect(authorLink).toHaveAttribute("href", "/users/testuser");
  });

  it("renders star rating '4.5 (10)'", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    expect(screen.getByText("4.5 (10)")).toBeInTheDocument();
  });

  it("shows dash when review_count is 0", () => {
    const noReviews = { ...mockPlugin, review_count: 0, average_rating: 0 };
    render(<PluginHeader plugin={noReviews} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("does not render badge for plugin older than 7 days", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
  });

  it("renders NEW badge for recently published plugin", () => {
    const recentPlugin = { ...mockPlugin, created_at: new Date().toISOString() };
    render(<PluginHeader plugin={recentPlugin} />);
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("renders breadcrumb with category link", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    const categoryLink = screen.getByRole("link", { name: "security" });
    expect(categoryLink).toHaveAttribute(
      "href",
      "/explorer?category=security",
    );
  });

  it("renders Source link when repository_url present", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    const sourceLink = screen.getByRole("link", { name: /Source/ });
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://github.com/test/repo",
    );
  });

  it("does not render Source link when repository_url is null", () => {
    const noRepo = { ...mockPlugin, repository_url: null };
    render(<PluginHeader plugin={noRepo} />);
    expect(screen.queryByRole("link", { name: /Source/ })).not.toBeInTheDocument();
  });

  it("renders builder link to the canonical server-builder route", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    const link = screen.getByRole("link", { name: /Build With Plugin/i });
    expect(link).toHaveAttribute("href", "/server-builder?plugin=test-plugin");
  });

  it("shows formatted date for plugins updated more than 30 days ago", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);
    const plugin = { ...mockPlugin, updated_at: oldDate.toISOString() };
    render(<PluginHeader plugin={plugin} />);
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });
});
