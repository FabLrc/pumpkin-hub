import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplorerSidebar } from "./ExplorerSidebar";

vi.mock("@/lib/hooks", () => ({
  useCategories: vi.fn(),
  usePumpkinVersions: vi.fn(),
}));

vi.mock("@/lib/category-icons", () => ({
  getCategoryIcon: () => (props: Record<string, unknown>) => (
    <svg data-testid="category-icon" {...props} />
  ),
}));

vi.mock("./SearchBar", () => ({
  SearchBar: ({ value, onChange }: { value: string; onChange: (q: string) => void }) => (
    <input
      data-testid="search-bar"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search plugins..."
    />
  ),
}));

import { useCategories, usePumpkinVersions } from "@/lib/hooks";

const mockUseCategories = vi.mocked(useCategories);
const mockUsePumpkinVersions = vi.mocked(usePumpkinVersions);

const defaultProps = {
  searchQuery: "",
  onSearchChange: vi.fn(),
  sortBy: "relevance" as const,
  onSortChange: vi.fn(),
  activeCategory: undefined as string | undefined,
  onCategoryChange: vi.fn(),
  activePlatform: undefined as string | undefined,
  onPlatformChange: vi.fn(),
  activePumpkinVersion: undefined as string | undefined,
  onPumpkinVersionChange: vi.fn(),
  facets: {
    categories: { performance: 10, security: 5 } as Record<string, number>,
    platforms: { windows: 15, linux: 8 } as Record<string, number>,
    pumpkin_versions: { "0.1.0": 3 } as Record<string, number>,
  },
  onClearFilters: vi.fn(),
};

describe("ExplorerSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCategories.mockReturnValue({
      data: [
        { slug: "performance", name: "Performance", icon: "zap" },
        { slug: "security", name: "Security", icon: "shield" },
      ],
      isLoading: false,
    } as ReturnType<typeof useCategories>);
    mockUsePumpkinVersions.mockReturnValue({
      data: [{ version: "0.1.0" }],
    } as ReturnType<typeof usePumpkinVersions>);
  });

  // ── Sort options ──────────────────────────────────────────────────────

  it("renders all sort options", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByText("Downloads ↓")).toBeInTheDocument();
    expect(screen.getByText("Newest")).toBeInTheDocument();
    expect(screen.getByText("Oldest")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Name A–Z")).toBeInTheDocument();
    expect(screen.getByText("Name Z–A")).toBeInTheDocument();
  });

  it("calls onSortChange when a sort option is clicked", async () => {
    const user = userEvent.setup();
    render(<ExplorerSidebar {...defaultProps} />);
    await user.click(screen.getByText("Downloads ↓"));
    expect(defaultProps.onSortChange).toHaveBeenCalledWith("downloads");
  });

  // ── Category filter ───────────────────────────────────────────────────

  it("renders All category button", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    // There are multiple "All" buttons (category, platform, version), just verify at least one exists
    const allButtons = screen.getAllByText("All");
    expect(allButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onCategoryChange with undefined when All is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExplorerSidebar {...defaultProps} activeCategory="performance" />,
    );
    // Click the first "All" button (category section)
    const allButtons = screen.getAllByText("All");
    await user.click(allButtons[0]);
    expect(defaultProps.onCategoryChange).toHaveBeenCalledWith(undefined);
  });

  it("renders category buttons from hook data", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("shows facet counts for categories", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onCategoryChange when category button is clicked", async () => {
    const user = userEvent.setup();
    render(<ExplorerSidebar {...defaultProps} />);
    await user.click(screen.getByText("Performance"));
    expect(defaultProps.onCategoryChange).toHaveBeenCalledWith("performance");
  });

  // ── Platform filter ───────────────────────────────────────────────────

  it("renders platform filter buttons", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.getByText("windows")).toBeInTheDocument();
    expect(screen.getByText("macos")).toBeInTheDocument();
    expect(screen.getByText("linux")).toBeInTheDocument();
  });

  it("calls onPlatformChange when platform is clicked", async () => {
    const user = userEvent.setup();
    render(<ExplorerSidebar {...defaultProps} />);
    await user.click(screen.getByText("linux"));
    expect(defaultProps.onPlatformChange).toHaveBeenCalledWith("linux");
  });

  it("shows facet counts for platforms", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  // ── Pumpkin version filter ────────────────────────────────────────────

  it("renders pumpkin version filter when data available", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
  });

  it("does not render pumpkin version section when no versions", () => {
    mockUsePumpkinVersions.mockReturnValue({
      data: [],
    } as ReturnType<typeof usePumpkinVersions>);
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.queryByText("Pumpkin Version")).not.toBeInTheDocument();
  });

  it("calls onPumpkinVersionChange when version is clicked", async () => {
    const user = userEvent.setup();
    render(<ExplorerSidebar {...defaultProps} />);
    await user.click(screen.getByText("0.1.0"));
    expect(defaultProps.onPumpkinVersionChange).toHaveBeenCalledWith("0.1.0");
  });

  // ── Clear filters ─────────────────────────────────────────────────────

  it("shows Clear all filters button when filters are active", () => {
    render(
      <ExplorerSidebar {...defaultProps} activeCategory="performance" />,
    );
    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("does not show Clear all filters when no filters active", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
  });

  it("calls onClearFilters when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExplorerSidebar {...defaultProps} activePlatform="linux" />,
    );
    await user.click(screen.getByText("Clear all filters"));
    expect(defaultProps.onClearFilters).toHaveBeenCalledOnce();
  });

  // ── Search bar ────────────────────────────────────────────────────────

  it("renders the search bar", () => {
    render(<ExplorerSidebar {...defaultProps} />);
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });
});
