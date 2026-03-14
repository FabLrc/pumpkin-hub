import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ticker } from "./Ticker";

describe("Ticker", () => {
  it("renders ticker text content", () => {
    render(<Ticker />);
    const matches = screen.getAllByText(/LATEST: New plugins available/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("contains text about SHA-256 verified binaries", () => {
    render(<Ticker />);
    const matches = screen.getAllByText(/SHA-256 verified binaries/);
    expect(matches.length).toBeGreaterThan(0);
  });
});
