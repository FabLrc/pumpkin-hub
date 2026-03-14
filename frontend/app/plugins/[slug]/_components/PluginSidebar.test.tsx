import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginSidebar } from "./PluginSidebar";
import type { PluginResponse } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/lib/hooks", () => ({
  usePluginVersions: () => ({
    data: {
      versions: [{ version: "1.0.0", is_yanked: false }],
      total: 1,
    },
    isLoading: false,
    error: null,
  }),
  usePluginDownloadStats: () => ({
    data: {
      chart: [{ period: "2024-W1", downloads: 100 }],
      downloads_last_30_days: 500,
      downloads_last_7_days: 120,
    },
  }),
  useGithubLink: () => ({
    data: { repository_full_name: "test/repo" },
    error: undefined,
  }),
}));

vi.mock("@/lib/api", () => ({
  getPluginBadgeUrl: (slug: string) =>
    `https://api.example.com/badge/${slug}`,
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

describe("PluginSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders download count", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    // toLocaleString output varies by locale (5,000 / 5 000 / 5.000)
    expect(screen.getByText((_content, element) => {
      return element?.tagName === "SPAN" &&
        element.className.includes("text-3xl") &&
        (element.textContent?.replace(/\D/g, "") === "5000" ?? false);
    })).toBeInTheDocument();
  });

  it("renders Source Repository link", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("Source Repository")).toBeInTheDocument();
  });

  it("renders Documentation link", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("Documentation")).toBeInTheDocument();
  });

  it("renders Report Issue link", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("Report Issue")).toBeInTheDocument();
  });

  it("renders Published date", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("01/01/2024")).toBeInTheDocument();
  });

  it("renders Updated date", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("06/01/2024")).toBeInTheDocument();
  });

  it("renders License", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("License")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  it("renders latest version tag when versions data available", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("LATEST")).toBeInTheDocument();
  });

  it("renders author card with username", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("Plugin Author")).toBeInTheDocument();
  });

  it("author card links to /users/testuser", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    const authorLink = screen.getByRole("link", { name: /testuser/i });
    expect(authorLink).toHaveAttribute("href", "/users/testuser");
  });

  it("shows author initials when no avatar", () => {
    render(<PluginSidebar plugin={mockPlugin} />);
    expect(screen.getByText("te")).toBeInTheDocument();
  });
});
