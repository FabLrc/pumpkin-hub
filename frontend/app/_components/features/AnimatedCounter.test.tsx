import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AnimatedCounter } from "./AnimatedCounter";

describe("AnimatedCounter", () => {
  it("renders with prefix and suffix", () => {
    const { container } = render(<AnimatedCounter target={42} prefix="$" suffix="M" />);
    expect(container.querySelector("span")?.textContent).toContain("0M");
  });

  it("renders with decimals", () => {
    const { container } = render(<AnimatedCounter target={99} decimals={1} />);
    expect(container.querySelector("span")?.textContent).toContain("0.0");
  });

  it("renders with custom className", () => {
    const { container } = render(<AnimatedCounter target={10} className="font-bold" />);
    expect(container.querySelector(".font-bold")).toBeInTheDocument();
  });

  it("uses tabular-nums font variant", () => {
    const { container } = render(<AnimatedCounter target={7} />);
    const span = container.querySelector("span");
    expect(span?.style.fontVariantNumeric).toBe("tabular-nums");
  });
});
