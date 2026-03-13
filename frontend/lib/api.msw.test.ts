import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fetchSuggestions } from "./api";
import { server } from "@/test/msw/server";

describe("lib/api with msw", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("returns suggestions from MSW contract handler", async () => {
    const result = await fetchSuggestions("pumpkin", 3);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ value: "pumpkin-suggestion-1" });
    expect(result[2]).toEqual({ value: "pumpkin-suggestion-3" });
  });
});
