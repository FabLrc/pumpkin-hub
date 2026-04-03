import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("lucide-react", () => ({
  Search: (props: Record<string, unknown>) => (
    <svg data-testid="search-icon" {...props} />
  ),
  Loader2: (props: Record<string, unknown>) => (
    <svg data-testid="loader-icon" {...props} />
  ),
}));

vi.mock("@/lib/api", () => ({
  getSuggestPath: (query: string, limit: number) =>
    `/api/v1/search/suggest?q=${query}&limit=${limit}`,
  swrFetcher: vi.fn(),
}));

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

const defaultProps = {
  value: "",
  onChange: vi.fn(),
};

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  // ── Basic rendering ───────────────────────────────────────────────────

  it("renders input with placeholder", () => {
    render(<SearchBar {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search plugins..."),
    ).toBeInTheDocument();
  });

  it("has combobox ARIA role", () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders with initial value", () => {
    render(<SearchBar {...defaultProps} value="hello" />);
    expect(screen.getByRole("combobox")).toHaveValue("hello");
  });

  // ── Search submission ─────────────────────────────────────────────────

  it("calls onChange on Enter key", async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "test-query");
    await user.keyboard("{Enter}");
    expect(defaultProps.onChange).toHaveBeenCalledWith("test-query");
  });

  // ── Suggestions dropdown ──────────────────────────────────────────────

  it("shows suggestions dropdown when suggestions are loaded", async () => {
    mockUseSWR.mockReturnValue({
      data: [
        { name: "PluginAlpha", slug: "plugin-alpha" },
        { name: "PluginBeta", slug: "plugin-beta" },
      ],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "plug");

    await waitFor(() => {
      expect(screen.getByText("PluginAlpha")).toBeInTheDocument();
      expect(screen.getByText("PluginBeta")).toBeInTheDocument();
    });
  });

  it("shows suggestions container when suggestions are open", async () => {
    mockUseSWR.mockReturnValue({
      data: [{ name: "PluginAlpha", slug: "plugin-alpha" }],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    await user.type(screen.getByRole("combobox"), "plug");

    await waitFor(() => {
      expect(document.getElementById("search-suggestions")).toBeInTheDocument();
    });
  });

  // ── Keyboard navigation ──────────────────────────────────────────────

  it("ArrowDown selects first suggestion", async () => {
    mockUseSWR.mockReturnValue({
      data: [
        { name: "PluginAlpha", slug: "plugin-alpha" },
        { name: "PluginBeta", slug: "plugin-beta" },
      ],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "plug");

    await waitFor(() => {
      expect(screen.getByText("PluginAlpha")).toBeInTheDocument();
    });

    await user.keyboard("{ArrowDown}");
    const firstOption = screen.getByRole("button", { name: "PluginAlpha" });
    expect(firstOption).toHaveClass("bg-accent/10");
  });

  it("ArrowUp moves selection up", async () => {
    mockUseSWR.mockReturnValue({
      data: [
        { name: "PluginAlpha", slug: "plugin-alpha" },
        { name: "PluginBeta", slug: "plugin-beta" },
      ],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "plug");

    await waitFor(() => {
      expect(screen.getByText("PluginAlpha")).toBeInTheDocument();
    });

    // Move down twice then up once
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");
    const firstOption = screen.getByRole("button", { name: "PluginAlpha" });
    expect(firstOption).toHaveClass("bg-accent/10");
  });

  it("Enter with active suggestion navigates to plugin", async () => {
    mockUseSWR.mockReturnValue({
      data: [
        { name: "PluginAlpha", slug: "plugin-alpha" },
        { name: "PluginBeta", slug: "plugin-beta" },
      ],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "plug");

    await waitFor(() => {
      expect(screen.getByText("PluginAlpha")).toBeInTheDocument();
    });

    await user.keyboard("{ArrowDown}{Enter}");
    expect(mockPush).toHaveBeenCalledWith("/plugins/plugin-alpha");
  });

  // ── Escape ────────────────────────────────────────────────────────────

  it("Escape closes the dropdown", async () => {
    mockUseSWR.mockReturnValue({
      data: [{ name: "PluginAlpha", slug: "plugin-alpha" }],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "plug");

    await waitFor(() => {
      expect(document.getElementById("search-suggestions")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(document.getElementById("search-suggestions")).not.toBeInTheDocument();
    });
  });

  // ── Loading state ─────────────────────────────────────────────────────

  it("shows loading indicator when suggestions are loading", async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    await user.type(screen.getByRole("combobox"), "plug");

    await waitFor(() => {
      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });
  });
});
