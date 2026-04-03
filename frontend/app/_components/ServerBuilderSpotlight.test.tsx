import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";
import { ServerBuilderSpotlight } from "./ServerBuilderSpotlight";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ServerBuilderSpotlight", () => {
  it("renders Server Builder heading", () => {
    render(<ServerBuilderSpotlight />);
    expect(screen.getByText("Server Builder")).toBeInTheDocument();
  });

  it("renders launch link to canonical route", () => {
    render(<ServerBuilderSpotlight />);
    const launch = screen.getByText("Launch Server Builder").closest("a");
    expect(launch).toHaveAttribute("href", "/server-builder");
  });

  it("renders saved builds link to dashboard route", () => {
    render(<ServerBuilderSpotlight />);
    const saved = screen.getByText("View Saved Builds").closest("a");
    expect(saved).toHaveAttribute("href", "/dashboard/server-builder");
  });
});
