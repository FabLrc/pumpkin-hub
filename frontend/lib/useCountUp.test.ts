import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInView, useCountUp } from "./useCountUp";

// jsdom has no IntersectionObserver, so hasIntersectionObserver=false
// useInView: inView defaults to true
// useCountUp: returns target immediately (no animation path)

describe("useInView", () => {
  it("returns inView=true since IO is absent in jsdom", () => {
    const { result } = renderHook(() => useInView(0.3));
    expect(result.current.inView).toBe(true);
    expect(result.current.ref).toBeDefined();
  });
});

describe("useCountUp", () => {
  it("returns target immediately since IO is absent", () => {
    const { result } = renderHook(() => useCountUp(100, false, 1500));
    expect(result.current).toBe(100);
  });
});
