import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginCard, formatDownloads, formatTimeAgo } from "./PluginCard";
import type { PluginSummary } from "@/lib/types";

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
}));

const makePlugin = (overrides: Partial<PluginSummary> = {}): PluginSummary => ({
  id: "p-1",
  name: "TestPlugin",
  slug: "test-plugin",
  short_description: "A short description",
  license: "MIT",
  downloads_total: 42,
  average_rating: 0,
  review_count: 0,
  author: { id: "u-1", username: "rustdev", avatar_url: null },
  categories: [
    { id: "c-1", name: "Performance", slug: "performance" },
    { id: "c-2", name: "Security", slug: "security" },
  ],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-06-01T12:00:00Z",
  ...overrides,
});

// ── formatDownloads ───────────────────────────────────────────────────────

describe("formatDownloads", () => {
  it("returns raw number below 1k", () => {
    expect(formatDownloads(0)).toBe("0");
    expect(formatDownloads(999)).toBe("999");
  });

  it("formats thousands with 'k'", () => {
    expect(formatDownloads(1_000)).toBe("1k");
    expect(formatDownloads(5_400)).toBe("5k");
    expect(formatDownloads(999_999)).toBe("1000k");
  });

  it("formats millions with 'M'", () => {
    expect(formatDownloads(1_000_000)).toBe("1.0M");
    expect(formatDownloads(2_500_000)).toBe("2.5M");
    expect(formatDownloads(10_000_000)).toBe("10.0M");
  });
});

// ── formatTimeAgo ─────────────────────────────────────────────────────────

describe("formatTimeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for < 60 seconds", () => {
    expect(formatTimeAgo("2025-07-01T11:59:30Z")).toBe("just now");
  });

  it("returns minutes for < 1 hour", () => {
    expect(formatTimeAgo("2025-07-01T11:30:00Z")).toBe("30m ago");
  });

  it("returns hours for < 1 day", () => {
    expect(formatTimeAgo("2025-07-01T02:00:00Z")).toBe("10h ago");
  });

  it("returns days for < 30 days", () => {
    expect(formatTimeAgo("2025-06-25T12:00:00Z")).toBe("6d ago");
  });

  it("returns formatted date for >= 30 days", () => {
    const result = formatTimeAgo("2025-01-15T00:00:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });
});

// ── PluginCard rendering ──────────────────────────────────────────────────

describe("PluginCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders plugin name and author", () => {
    render(<PluginCard plugin={makePlugin()} />);
    expect(screen.getByText("TestPlugin")).toBeInTheDocument();
    expect(screen.getByText("rustdev")).toBeInTheDocument();
  });

  it("renders short description when present", () => {
    render(<PluginCard plugin={makePlugin()} />);
    expect(screen.getByText("A short description")).toBeInTheDocument();
  });

  it("does not render short_description when null", () => {
    render(
      <PluginCard plugin={makePlugin({ short_description: null })} />
    );
    expect(screen.queryByText("A short description")).not.toBeInTheDocument();
  });

  it("renders categories as hashtag badges", () => {
    render(<PluginCard plugin={makePlugin()} />);
    expect(screen.getByText("#performance")).toBeInTheDocument();
    expect(screen.getByText("#security")).toBeInTheDocument();
  });

  it("renders license when present", () => {
    render(<PluginCard plugin={makePlugin()} />);
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  it("does not render license when null", () => {
    render(<PluginCard plugin={makePlugin({ license: null })} />);
    expect(screen.queryByText("MIT")).not.toBeInTheDocument();
  });

  it("renders formatted download count", () => {
    render(<PluginCard plugin={makePlugin({ downloads_total: 5_000 })} />);
    expect(screen.getByText("5k")).toBeInTheDocument();
  });

  it("links to the plugin page", () => {
    render(<PluginCard plugin={makePlugin()} />);
    const link = screen.getByRole("link", { name: "TestPlugin" });
    expect(link).toHaveAttribute("href", "/plugins/test-plugin");
  });

  it("renders two-letter icon from plugin name", () => {
    render(<PluginCard plugin={makePlugin({ name: "MyPlugin" })} />);
    expect(screen.getByText("MY")).toBeInTheDocument();
  });

  it("shows FEATURED badge when featured", () => {
    render(<PluginCard plugin={makePlugin()} featured />);
    expect(screen.getByText("FEATURED")).toBeInTheDocument();
  });

  it("does not show FEATURED badge by default", () => {
    render(<PluginCard plugin={makePlugin()} />);
    expect(screen.queryByText("FEATURED")).not.toBeInTheDocument();
  });

  it("applies featured styling when featured", () => {
    const { container } = render(
      <PluginCard plugin={makePlugin()} featured />
    );
    const card = container.querySelector(".plugin-card");
    expect(card?.classList.contains("featured")).toBe(true);
  });

  it("renders relative time for updated_at", () => {
    render(
      <PluginCard
        plugin={makePlugin({ updated_at: "2025-06-30T12:00:00Z" })}
      />
    );
    expect(screen.getByText(/Updated 1d ago/)).toBeInTheDocument();
  });
});
