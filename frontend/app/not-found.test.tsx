import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("NotFound", () => {
  it("renders 404 and Page Not Found", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  });

  it("has Go Home link to /", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: /Go Home/i })).toHaveAttribute("href", "/");
  });

  it("has Browse Plugins link to /explorer", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: /Browse Plugins/i })).toHaveAttribute("href", "/explorer");
  });
});
