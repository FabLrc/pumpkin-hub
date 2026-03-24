import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplorerResults } from "./ExplorerResults";
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

vi.mock("./SearchHitCard", () => ({
  SearchHitCard: ({ hit, featured }: { hit: SearchHit; featured?: boolean }) => (
    <div data-testid="search-hit-card" data-slug={hit.slug} data-featured={featured}>
      {hit.name}
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  List: (props: Record<string, unknown>) => <svg data-testid="list-icon" {...props} />,
  LayoutGrid: (props: Record<string, unknown>) => <svg data-testid="grid-icon" {...props} />,
}));

const makeHit = (id: string, name: string): SearchHit => ({
  id,
  slug: name.toLowerCase().replace(/\s/g, "-"),
  name,
  short_description: `Description for ${name}`,
  icon_url: null,
  author_username: "author",
  downloads_total: 100,
  average_rating: 4.0,
  review_count: 5,
  categories: [],
  category_slugs: ["performance"],
  platforms: ["linux"],
  pumpkin_versions: [],
  license: "MIT",
  created_at_timestamp: Math.floor(Date.now() / 1000),
  updated_at_timestamp: Math.floor(Date.now() / 1000),
});

const defaultProps = {
  hits: [makeHit("1", "Alpha"), makeHit("2", "Beta"), makeHit("3", "Gamma")],
  estimatedTotal: 42,
  processingTimeMs: 12,
  isLoading: false,
  currentPage: 1,
  perPage: 20,
  onPageChange: vi.fn(),
  searchQuery: "test",
  sortBy: "relevance" as const,
  viewMode: "list" as const,
  onViewModeChange: vi.fn(),
};

describe("ExplorerResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Header info ────────────────────────────────────────────────────────

  it("shows total hits count", () => {
    render(<ExplorerResults {...defaultProps} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/plugins/)).toBeInTheDocument();
  });

  it("shows processing time", () => {
    render(<ExplorerResults {...defaultProps} />);
    expect(screen.getByText("in 12ms")).toBeInTheDocument();
  });

  it("does not show processing time when null", () => {
    render(<ExplorerResults {...defaultProps} processingTimeMs={null} />);
    expect(screen.queryByText(/\d+ms/)).not.toBeInTheDocument();
  });

  // ── Results rendering ─────────────────────────────────────────────────

  it("renders list of SearchHitCards", () => {
    render(<ExplorerResults {...defaultProps} />);
    const cards = screen.getAllByTestId("search-hit-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("marks first hit as featured on page 1", () => {
    render(<ExplorerResults {...defaultProps} />);
    const cards = screen.getAllByTestId("search-hit-card");
    expect(cards[0]).toHaveAttribute("data-featured", "true");
    expect(cards[1]).toHaveAttribute("data-featured", "false");
  });

  it("does not mark first hit as featured on page 2", () => {
    render(<ExplorerResults {...defaultProps} currentPage={2} />);
    const cards = screen.getAllByTestId("search-hit-card");
    expect(cards[0]).toHaveAttribute("data-featured", "false");
  });

  // ── Empty state ────────────────────────────────────────────────────────

  it("shows empty state when no hits", () => {
    render(<ExplorerResults {...defaultProps} hits={[]} estimatedTotal={0} />);
    expect(screen.getByText("No plugins found")).toBeInTheDocument();
    expect(
      screen.getByText(/Try adjusting your filters/),
    ).toBeInTheDocument();
  });

  // ── Loading skeleton ──────────────────────────────────────────────────

  it("shows loading skeleton when isLoading", () => {
    const { container } = render(
      <ExplorerResults {...defaultProps} isLoading={true} hits={[]} />,
    );
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  // ── View mode toggle ──────────────────────────────────────────────────

  it("renders list and grid view toggle buttons", () => {
    render(<ExplorerResults {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /list view/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /grid view/i }),
    ).toBeInTheDocument();
  });

  it("calls onViewModeChange when grid button clicked", async () => {
    const user = userEvent.setup();
    render(<ExplorerResults {...defaultProps} viewMode="list" />);
    await user.click(screen.getByRole("button", { name: /grid view/i }));
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("grid");
  });

  it("calls onViewModeChange when list button clicked", async () => {
    const user = userEvent.setup();
    render(<ExplorerResults {...defaultProps} viewMode="grid" />);
    await user.click(screen.getByRole("button", { name: /list view/i }));
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("list");
  });

  // ── Pagination ────────────────────────────────────────────────────────

  it("shows pagination when multiple pages", () => {
    render(
      <ExplorerResults
        {...defaultProps}
        estimatedTotal={100}
        perPage={20}
        currentPage={1}
      />,
    );
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("does not show pagination when single page", () => {
    render(
      <ExplorerResults
        {...defaultProps}
        estimatedTotal={10}
        perPage={20}
        currentPage={1}
      />,
    );
    expect(screen.queryByText(/Page \d+ of/)).not.toBeInTheDocument();
  });

  it("calls onPageChange when next button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExplorerResults
        {...defaultProps}
        estimatedTotal={100}
        perPage={20}
        currentPage={2}
      />,
    );
    // The "→" next button
    const nextBtn = screen.getByRole("button", { name: "→" });
    await user.click(nextBtn);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange when previous button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExplorerResults
        {...defaultProps}
        estimatedTotal={100}
        perPage={20}
        currentPage={3}
      />,
    );
    const prevBtn = screen.getByRole("button", { name: "←" });
    await user.click(prevBtn);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables previous button on first page", () => {
    render(
      <ExplorerResults
        {...defaultProps}
        estimatedTotal={100}
        perPage={20}
        currentPage={1}
      />,
    );
    const prevBtn = screen.getByRole("button", { name: "←" });
    expect(prevBtn).toBeDisabled();
  });

  it("calls onPageChange with page number when page button clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExplorerResults
        {...defaultProps}
        estimatedTotal={100}
        perPage={20}
        currentPage={1}
      />,
    );
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
  });
});
