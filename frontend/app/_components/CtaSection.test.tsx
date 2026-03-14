import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CtaSection } from "./CtaSection";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("CtaSection", () => {
  it("renders 'Ready to build?' heading", () => {
    render(<CtaSection />);
    expect(screen.getByText("Ready to build?")).toBeInTheDocument();
  });

  it("renders 'Browse Plugins' link pointing to /explorer", () => {
    render(<CtaSection />);
    const link = screen.getByText("Browse Plugins").closest("a");
    expect(link).toHaveAttribute("href", "/explorer");
  });

  it("renders 'Publish a Plugin' link pointing to /plugins/new", () => {
    render(<CtaSection />);
    const link = screen.getByText(/Publish a Plugin/).closest("a");
    expect(link).toHaveAttribute("href", "/plugins/new");
  });
});
