import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useViewPreference } from "./useViewPreference";

describe("useViewPreference", () => {
  it("defaults to list when nothing is stored", () => {
    localStorage.removeItem("pumpkin-hub:explorer-view");

    const { result } = renderHook(() => useViewPreference());
    expect(result.current.viewMode).toBe("list");
  });

  it("reads persisted grid value and updates subscribers", () => {
    localStorage.setItem("pumpkin-hub:explorer-view", "grid");

    const first = renderHook(() => useViewPreference());
    const second = renderHook(() => useViewPreference());

    expect(first.result.current.viewMode).toBe("grid");
    expect(second.result.current.viewMode).toBe("grid");

    act(() => {
      first.result.current.setViewMode("list");
    });

    expect(localStorage.getItem("pumpkin-hub:explorer-view")).toBe("list");
    expect(first.result.current.viewMode).toBe("list");
    expect(second.result.current.viewMode).toBe("list");
  });

  it("falls back to list when localStorage has invalid value", () => {
    localStorage.setItem("pumpkin-hub:explorer-view", "invalid");

    const { result } = renderHook(() => useViewPreference());
    expect(result.current.viewMode).toBe("list");
  });
});
