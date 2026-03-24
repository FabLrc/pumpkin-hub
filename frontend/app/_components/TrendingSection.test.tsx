import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendingSection } from "./TrendingSection";
import type { PluginSummary } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const makePlugin = (overrides: Partial<PluginSummary> = {}): PluginSummary => ({
  id: "p1",
  author: { id: "u1", username: "alice", avatar_url: null },
  name: "TestPlugin",
  slug: "test-plugin",
  short_description: "A test plugin",
  icon_url: null,
  license: "MIT",
  downloads_total: 1500,
  categories: [{ id: "c1", name: "Security", slug: "security" }],
  average_rating: 4.0,
  review_count: 10,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("TrendingSection", () => {
  it("renders featured plugin with #1 Trending badge", () => {
    render(<TrendingSection plugins={[makePlugin()]} />);
    expect(screen.getByText("TestPlugin")).toBeInTheDocument();
    expect(screen.getByText("#1 Trending")).toBeInTheDocument();
    expect(screen.getByText("1.5k downloads")).toBeInTheDocument();
  });

  it("renders up to 4 small bento cards from rest of plugins", () => {
    const plugins = [
      makePlugin({ id: "p1", name: "Alpha", slug: "alpha" }),
      makePlugin({ id: "p2", name: "Beta", slug: "beta" }),
      makePlugin({ id: "p3", name: "Gamma", slug: "gamma" }),
    ];
    render(<TrendingSection plugins={plugins} />);
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("renders placeholder when no plugins provided", () => {
    render(<TrendingSection plugins={[]} />);
    expect(
      screen.getByText("No plugins yet — be the first to publish!"),
    ).toBeInTheDocument();
  });

  it("shows 'View all' link to explorer", () => {
    render(<TrendingSection plugins={[]} />);
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/explorer",
    );
  });

  it("formats large download counts in millions", () => {
    render(<TrendingSection plugins={[makePlugin({ downloads_total: 2_500_000 })]} />);
    expect(screen.getByText("2.5M downloads")).toBeInTheDocument();
  });
});
