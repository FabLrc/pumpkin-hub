import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
}));

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

  it("renders FEATURED badge", () => {
    render(<PluginHeader plugin={mockPlugin} />);
    expect(screen.getByText("FEATURED")).toBeInTheDocument();
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

  it("Quick Install button toggles install panel", async () => {
    const user = userEvent.setup();
    render(<PluginHeader plugin={mockPlugin} />);

    // Click Quick Install
    await user.click(
      screen.getByRole("button", { name: /Quick Install/i }),
    );

    // Panel content now present
    expect(screen.getByText(/Install via Pumpkin CLI/i)).toBeInTheDocument();
  });

  it("install panel shows CLI command with plugin slug", async () => {
    const user = userEvent.setup();
    render(<PluginHeader plugin={mockPlugin} />);

    await user.click(
      screen.getByRole("button", { name: /Quick Install/i }),
    );

    expect(
      screen.getByText("pumpkin install test-plugin"),
    ).toBeInTheDocument();
  });

  it("install panel has copy buttons", async () => {
    const user = userEvent.setup();
    render(<PluginHeader plugin={mockPlugin} />);

    await user.click(
      screen.getByRole("button", { name: /Quick Install/i }),
    );

    const copyButtons = screen.getAllByRole("button", { name: /COPY/i });
    expect(copyButtons.length).toBeGreaterThanOrEqual(2);
  });
});
