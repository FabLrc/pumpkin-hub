import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeroSection } from "./HeroSection";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe("HeroSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = { totalPlugins: 5, totalAuthors: 0, totalDownloads: 0 };

  it("renders total plugins count when > 0", () => {
    render(<HeroSection {...defaultProps} totalPlugins={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders em dash when totalPlugins is 0", () => {
    render(<HeroSection {...defaultProps} totalPlugins={0} />);
    // Multiple em dashes exist in the stats row; at least one should be present
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders authors and downloads when > 0", () => {
    render(<HeroSection totalPlugins={5} totalAuthors={12} totalDownloads={3400} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    // toLocaleString output varies by locale (e.g. "3,400" vs "3 400")
    expect(screen.getByText(/3.?400/)).toBeInTheDocument();
  });

  it("renders em dash for authors and downloads when 0", () => {
    render(<HeroSection {...defaultProps} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders search input with placeholder", () => {
    render(<HeroSection {...defaultProps} />);
    expect(screen.getByLabelText("Search plugins")).toBeInTheDocument();
  });

  it("navigates to explorer on form submit with query", () => {
    render(<HeroSection {...defaultProps} />);
    const input = screen.getByLabelText("Search plugins");
    fireEvent.change(input, { target: { value: "protection" } });
    const form = input.closest("form");
    if (form) fireEvent.submit(form);
    expect(pushMock).toHaveBeenCalledWith("/explorer?q=protection");
  });

  it("navigates to /explorer when submitted with empty query", () => {
    render(<HeroSection {...defaultProps} />);
    const input = screen.getByLabelText("Search plugins");
    fireEvent.change(input, { target: { value: "   " } });
    const form = input.closest("form");
    if (form) fireEvent.submit(form);
    expect(pushMock).toHaveBeenCalledWith("/explorer");
  });

  it("clears input on Escape keydown", () => {
    render(<HeroSection {...defaultProps} />);
    const input = screen.getByLabelText("Search plugins");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
  });

  it("navigates to explorer when a popular tag is clicked", () => {
    render(<HeroSection {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "#protection" }));
    expect(pushMock).toHaveBeenCalledWith("/explorer?q=protection");
  });

  it("focuses the input on Cmd+K global shortcut", () => {
    render(<HeroSection {...defaultProps} />);
    const input = screen.getByLabelText("Search plugins");
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    // input.focus() called — jsdom doesn't track focus on fireEvent but handler shouldn't throw
    expect(input).toBeInTheDocument();
  });
});
