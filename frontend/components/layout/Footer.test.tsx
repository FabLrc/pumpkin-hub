import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders branding and github link", () => {
    render(<Footer />);

    expect(screen.getByText(/Pumpkin Hub/i)).toBeInTheDocument();
    const githubLink = screen.getByRole("link", { name: "GitHub" });
    expect(githubLink).toHaveAttribute("href", "https://github.com/Snowiiii/Pumpkin");
    expect(githubLink).toHaveAttribute("target", "_blank");
  });
});
