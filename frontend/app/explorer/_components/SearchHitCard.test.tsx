import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchHitCard } from "./SearchHitCard";
import type { SearchHit } from "@/lib/types";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  Star: (props: Record<string, unknown>) => (
    <svg data-testid="star-icon" {...props} />
  ),
  Download: (props: Record<string, unknown>) => (
    <svg data-testid="download-icon" {...props} />
  ),
}));

const makeHit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  id: "hit-1",
  slug: "my-plugin",
  name: "MyPlugin",
  short_description: "A great plugin for Pumpkin",
  author_username: "rustdev",
  downloads_total: 12500,
  average_rating: 4.3,
  review_count: 17,
  categories: [],
  category_slugs: ["performance", "security"],
  pumpkin_versions: [],
  platforms: ["windows", "linux"],
  license: "MIT",
  created_at_timestamp: Math.floor(new Date("2024-01-01T00:00:00Z").getTime() / 1000),
  updated_at_timestamp: Math.floor(new Date("2025-06-30T12:00:00Z").getTime() / 1000),
  ...overrides,
} as SearchHit);

describe("SearchHitCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Basic rendering (list mode default) ────────────────────────────────

  it("renders plugin name and author", () => {
    render(<SearchHitCard hit={makeHit()} />);
    expect(screen.getByText("MyPlugin")).toBeInTheDocument();
    expect(screen.getByText("rustdev")).toBeInTheDocument();
  });

  it("renders short description", () => {
    render(<SearchHitCard hit={makeHit()} />);
    expect(screen.getByText("A great plugin for Pumpkin")).toBeInTheDocument();
  });

  it("does not render description when null", () => {
    render(<SearchHitCard hit={makeHit({ short_description: null })} />);
    expect(
      screen.queryByText("A great plugin for Pumpkin"),
    ).not.toBeInTheDocument();
  });

  it("renders formatted download count", () => {
    render(<SearchHitCard hit={makeHit({ downloads_total: 5000 })} />);
    expect(screen.getByText("5k")).toBeInTheDocument();
  });

  it("renders rating with review count", () => {
    render(<SearchHitCard hit={makeHit()} />);
    expect(screen.getByText("4.3 (17)")).toBeInTheDocument();
  });

  it("shows dash when no reviews", () => {
    render(
      <SearchHitCard
        hit={makeHit({ review_count: 0, average_rating: 0 })}
      />,
    );
    // both list and grid render "—" for no reviews
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders category slugs as hashtags", () => {
    render(<SearchHitCard hit={makeHit()} />);
    expect(screen.getByText("#performance")).toBeInTheDocument();
    expect(screen.getByText("#security")).toBeInTheDocument();
  });

  it("renders platform badges", () => {
    render(<SearchHitCard hit={makeHit()} />);
    expect(screen.getByText("windows")).toBeInTheDocument();
    expect(screen.getByText("linux")).toBeInTheDocument();
  });

  it("renders license when present", () => {
    render(<SearchHitCard hit={makeHit()} />);
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  // ── Featured badge ─────────────────────────────────────────────────────

  it("shows FEATURED badge when featured", () => {
    render(<SearchHitCard hit={makeHit()} featured />);
    expect(screen.getByText("FEATURED")).toBeInTheDocument();
  });

  it("does not show FEATURED badge by default", () => {
    render(<SearchHitCard hit={makeHit()} />);
    expect(screen.queryByText("FEATURED")).not.toBeInTheDocument();
  });

  // ── Two-letter icon ────────────────────────────────────────────────────

  it("renders two-letter icon from plugin name", () => {
    render(<SearchHitCard hit={makeHit({ name: "AwesomeTool" })} />);
    expect(screen.getByText("AW")).toBeInTheDocument();
  });

  // ── Grid view mode ────────────────────────────────────────────────────

  it("renders grid view when viewMode is grid", () => {
    render(<SearchHitCard hit={makeHit()} viewMode="grid" />);
    expect(screen.getByText("MyPlugin")).toBeInTheDocument();
    expect(screen.getByText(/rustdev/)).toBeInTheDocument();
  });

  it("shows FEATURED badge in grid mode", () => {
    render(<SearchHitCard hit={makeHit()} viewMode="grid" featured />);
    expect(screen.getByText("FEATURED")).toBeInTheDocument();
  });

  it("renders category slugs in grid mode (limited to 2)", () => {
    render(
      <SearchHitCard
        hit={makeHit({
          category_slugs: ["performance", "security", "utility"],
        })}
        viewMode="grid"
      />,
    );
    expect(screen.getByText("#performance")).toBeInTheDocument();
    expect(screen.getByText("#security")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("shows dash for no rating in grid mode", () => {
    render(
      <SearchHitCard
        hit={makeHit({ review_count: 0, average_rating: 0 })}
        viewMode="grid"
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // ── Link ───────────────────────────────────────────────────────────────

  it("links to plugin detail page", () => {
    render(<SearchHitCard hit={makeHit()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/plugins/my-plugin");
  });
});
