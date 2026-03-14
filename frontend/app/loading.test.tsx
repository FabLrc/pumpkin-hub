import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "./loading";

describe("Loading", () => {
  it("renders Loading... text", () => {
    render(<Loading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders spinner element", () => {
    const { container } = render(<Loading />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
