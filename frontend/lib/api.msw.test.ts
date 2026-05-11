import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import {
  fetchSuggestions,
  fetchPlugins,
  fetchPlugin,
  createPlugin,
  createVersion,
  fetchCategories,
  fetchSearch,
  fetchCurrentUser,
  fetchPumpkinVersions,
  fetchPluginVersions,
} from "./api";

describe("lib/api integration with MSW", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("returns suggestions from search/suggest", async () => {
    const result = await fetchSuggestions("auth", 2);
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("auth-suggestion-1");
  });

  it("fetches paginated plugins list", async () => {
    const result = await fetchPlugins({ page: 1, per_page: 5 });
    expect(result.data).toHaveLength(5);
    expect(result.pagination.total).toBe(42);
  });

  it("fetches a single plugin by slug", async () => {
    const plugin = await fetchPlugin("my-plugin");
    expect(plugin.name).toBe("Test Plugin");
    expect(plugin.slug).toBe("my-plugin");
  });

  it("returns 404 for unknown plugin", async () => {
    await expect(fetchPlugin("not-found")).rejects.toThrow("Plugin not found");
  });

  it("creates a new plugin", async () => {
    const plugin = await createPlugin({
      name: "My New Plugin",
      short_description: "A test plugin",
      category_ids: ["c-1"],
    });
    expect(plugin.name).toBe("My New Plugin");
    expect(plugin.slug).toBe("my-new-plugin");
  });

  it("rejects plugin creation without name", async () => {
    await expect(createPlugin({ name: "" })).rejects.toThrow("name is required");
  });

  it("creates a version for a plugin", async () => {
    const version = await createVersion("my-plugin", {
      version: "2.0.0",
      changelog: "Major update",
      pumpkin_version_min: "0.3.0",
    });
    expect(version.version).toBe("2.0.0");
  });

  it("rejects duplicate version", async () => {
    await expect(
      createVersion("my-plugin", { version: "0.0.0" }),
    ).rejects.toThrow("version already exists");
  });

  it("fetches categories", async () => {
    const categories = await fetchCategories();
    expect(categories).toHaveLength(3);
    expect(categories[0]!.name).toBe("Performance");
  });

  it("performs full-text search", async () => {
    const result = await fetchSearch({ q: "auth", page: 1, per_page: 5 });
    expect(result.hits).toHaveLength(5);
    expect(result.facet_distribution).not.toBeNull();
    expect(result.estimated_total_hits).toBe(42);
  });

  it("fetches current user", async () => {
    const user = await fetchCurrentUser();
    expect(user.username).toBe("testuser");
    expect(user.role).toBe("author");
  });

  it("fetches pumpkin versions", async () => {
    const versions = await fetchPumpkinVersions();
    expect(versions).toHaveLength(3);
    expect(versions[0]!.version).toBe("0.1.0");
  });

  it("fetches plugin versions list", async () => {
    const result = await fetchPluginVersions("my-plugin");
    expect(result.total).toBe(2);
    expect(result.versions[0]!.version).toBe("1.0.0");
  });

  it("handles empty search results", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/search", () =>
        HttpResponse.json({
          hits: [],
          query: "zzzzz",
          processing_time_ms: 1,
          estimated_total_hits: 0,
          facet_distribution: null,
          page: 1,
          per_page: 10,
        }),
      ),
    );
    const result = await fetchSearch({ q: "zzzzz" });
    expect(result.hits).toHaveLength(0);
    expect(result.estimated_total_hits).toBe(0);
  });

  it("handles API error with structured ApiError type", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/plugins/error-test", () =>
        HttpResponse.json({ error: "Something went wrong" }, { status: 500 }),
      ),
    );
    await expect(fetchPlugin("error-test")).rejects.toThrow("Something went wrong");
  });
});
