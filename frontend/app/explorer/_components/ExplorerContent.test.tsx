import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExplorerContent } from "./ExplorerContent";

const pushMock = vi.fn();
const useSearchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/hooks", () => ({
  useSearch: (...args: unknown[]) => useSearchMock(...args),
}));

vi.mock("@/lib/useViewPreference", () => ({
  useViewPreference: () => ({ viewMode: "grid" as const, setViewMode: vi.fn() }),
}));

vi.mock("./ExplorerSidebar", () => ({
  ExplorerSidebar: (props: any) => (
    <div data-testid="explorer-sidebar">
      <button onClick={() => props.onSearchChange("test")}>search</button>
      <button onClick={() => props.onSortChange("name")}>sort</button>
      <button onClick={() => props.onCategoryChange("security")}>category</button>
      <button onClick={() => props.onPlatformChange("windows")}>platform</button>
      <button onClick={() => props.onPumpkinVersionChange("1.0")}>version</button>
      <button onClick={() => props.onClearFilters()}>clear</button>
    </div>
  ),
}));

vi.mock("./ExplorerResults", () => ({
  ExplorerResults: (props: any) => (
    <div data-testid="explorer-results">
      <span data-testid="loading">{String(props.isLoading)}</span>
      <button onClick={() => props.onPageChange(2)}>page2</button>
    </div>
  ),
}));

describe("ExplorerContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchMock.mockReturnValue({ data: null, isLoading: false });
  });

  it("renders sidebar and results", () => {
    render(<ExplorerContent />);
    expect(screen.getByTestId("explorer-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("explorer-results")).toBeInTheDocument();
  });

  it("passes isLoading to results", () => {
    useSearchMock.mockReturnValue({ data: null, isLoading: true });
    render(<ExplorerContent />);
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
  });

  it("handles search change via sidebar", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ExplorerContent />);
    await user.click(screen.getByText("search"));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("q=test"));
  });

  it("handles sort change", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ExplorerContent />);
    await user.click(screen.getByText("sort"));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("sort=name"));
  });

  it("handles category change", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ExplorerContent />);
    await user.click(screen.getByText("category"));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("category=security"));
  });

  it("handles platform change", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ExplorerContent />);
    await user.click(screen.getByText("platform"));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("platform=windows"));
  });

  it("handles pumpkin version change", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ExplorerContent />);
    await user.click(screen.getByText("version"));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("pumpkin_version=1.0"));
  });

  it("handles page change", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ExplorerContent />);
    await user.click(screen.getByText("page2"));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("handles clear filters", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<ExplorerContent />);
    await user.click(screen.getByText("clear"));
    expect(pushMock).toHaveBeenCalledWith("/explorer");
  });
});
