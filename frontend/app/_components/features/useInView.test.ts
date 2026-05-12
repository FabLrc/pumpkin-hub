import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInView, prefersReducedMotion } from "./useInView";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useInView", () => {
  it("returns [ref, false] initially with defaults", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
      })),
    );
    const { result } = renderHook(() => useInView());
    expect(result.current[1]).toBe(false);
    expect(result.current[0]).toBeDefined();
  });

  it("skips observer when no node", () => {
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({ observe, disconnect: vi.fn() })),
    );
    renderHook(() => useInView());
    expect(observe).not.toHaveBeenCalled();
  });
});

describe("prefersReducedMotion", () => {
  it("returns false when window is undefined", () => {
    const win = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: undefined, writable: true, configurable: true });
    expect(prefersReducedMotion()).toBe(false);
    Object.defineProperty(globalThis, "window", { value: win, writable: true, configurable: true });
  });

  it("returns false when prefers-reduced-motion is no-preference", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    vi.stubGlobal("matchMedia", matchMedia);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when prefers-reduced-motion is reduce", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal("matchMedia", matchMedia);
    expect(prefersReducedMotion()).toBe(true);
  });
});
