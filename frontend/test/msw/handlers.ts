import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:8080/api/v1";

// ─── Factories ──────────────────────────────────────────────────────────────

function createPluginSummary(id: number): Record<string, unknown> {
  return {
    id: `p-${id}`,
    author: { id: `a-${id}`, username: `author-${id}`, avatar_url: null },
    name: `Plugin ${id}`,
    slug: `plugin-${id}`,
    short_description: `Description for plugin ${id}`,
    icon_url: null,
    license: "MIT",
    downloads_total: id * 1000,
    categories: [{ id: `c-${id}`, name: `Category ${id}`, slug: `cat-${id}` }],
    average_rating: 4.5,
    review_count: 10,
    created_at: "2025-07-01T12:00:00Z",
    updated_at: "2025-07-10T12:00:00Z",
  };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export const handlers = [
  // ── Health ──────────────────────────────────────────────────────────────
  http.get(`${API_BASE}/health`, () =>
    HttpResponse.json({ status: "ok" }),
  ),

  // ── Public stats ────────────────────────────────────────────────────────
  http.get(`${API_BASE}/stats`, () =>
    HttpResponse.json({
      total_plugins: 42,
      total_authors: 18,
      total_downloads: 1250000,
    }),
  ),

  // ── Categories ──────────────────────────────────────────────────────────
  http.get(`${API_BASE}/categories`, () =>
    HttpResponse.json([
      { id: "c-1", name: "Performance", slug: "performance", description: "Performance plugins", icon: "zap", display_order: 1, created_at: "2025-01-01T00:00:00Z" },
      { id: "c-2", name: "Security", slug: "security", description: "Security plugins", icon: "shield", display_order: 2, created_at: "2025-01-01T00:00:00Z" },
      { id: "c-3", name: "Admin Tools", slug: "admin-tools", description: "Admin utilities", icon: "settings", display_order: 3, created_at: "2025-01-01T00:00:00Z" },
    ]),
  ),

  // ── Plugins list ───────────────────────────────────────────────────────
  http.get(`${API_BASE}/plugins`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const perPage = Number(url.searchParams.get("per_page") ?? "10");
    const items = Array.from({ length: perPage }, (_, i) =>
      createPluginSummary((page - 1) * perPage + i + 1),
    );
    return HttpResponse.json({
      data: items,
      pagination: { page, per_page: perPage, total: 42, total_pages: Math.ceil(42 / perPage) },
    });
  }),

  // ── Plugin detail ───────────────────────────────────────────────────────
  http.get(`${API_BASE}/plugins/:slug`, ({ params }) => {
    const { slug } = params;
    if (slug === "not-found") {
      return HttpResponse.json({ error: "Plugin not found" }, { status: 404 });
    }
    return HttpResponse.json({
      id: "p-1",
      author: { id: "a-1", username: "author-1", avatar_url: null },
      name: "Test Plugin",
      slug,
      short_description: "A test plugin description",
      description: "Full **markdown** description",
      repository_url: "https://github.com/test/test-plugin",
      documentation_url: null,
      license: "MIT",
      downloads_total: 5000,
      categories: [{ id: "c-1", name: "Performance", slug: "performance" }],
      average_rating: 4.2,
      review_count: 8,
      created_at: "2025-07-01T12:00:00Z",
      updated_at: "2025-07-15T12:00:00Z",
    });
  }),

  // ── Create plugin ───────────────────────────────────────────────────────
  http.post(`${API_BASE}/plugins`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name) {
      return HttpResponse.json({ error: "name is required" }, { status: 422 });
    }
    return HttpResponse.json(
      {
        id: "p-new",
        author: { id: "a-1", username: "author-1", avatar_url: null },
        name: body.name,
        slug: (body.name as string).toLowerCase().replace(/\s+/g, "-"),
        short_description: body.short_description ?? null,
        description: null,
        repository_url: null,
        documentation_url: null,
        license: null,
        downloads_total: 0,
        categories: [],
        average_rating: 0,
        review_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // ── Plugin versions ────────────────────────────────────────────────────
  http.get(`${API_BASE}/plugins/:slug/versions`, ({ params }) => {
    const { slug } = params;
    return HttpResponse.json({
      plugin_slug: slug as string,
      total: 2,
      versions: [
        { id: "v-1", version: "1.0.0", changelog: "Initial release", pumpkin_version_min: "0.1.0", pumpkin_version_max: "0.2.0", downloads: 100, is_yanked: false, published_at: "2025-07-01T12:00:00Z" },
        { id: "v-2", version: "1.1.0", changelog: "Bug fixes", pumpkin_version_min: "0.1.0", pumpkin_version_max: "0.3.0", downloads: 50, is_yanked: false, published_at: "2025-07-10T12:00:00Z" },
      ],
    });
  }),

  // ── Create version ─────────────────────────────────────────────────────
  http.post(`${API_BASE}/plugins/:slug/versions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.version) {
      return HttpResponse.json({ error: "version is required" }, { status: 422 });
    }
    if (body.version === "0.0.0") {
      return HttpResponse.json({ error: "version already exists" }, { status: 409 });
    }
    return HttpResponse.json(
      { id: "v-new", version: body.version, changelog: body.changelog ?? null, pumpkin_version_min: body.pumpkin_version_min ?? null, pumpkin_version_max: body.pumpkin_version_max ?? null, downloads: 0, is_yanked: false, published_at: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // ── Search ─────────────────────────────────────────────────────────────
  http.get(`${API_BASE}/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const category = url.searchParams.get("category");
    const page = Number(url.searchParams.get("page") ?? "1");
    const perPage = Number(url.searchParams.get("per_page") ?? "10");
    const hits = Array.from({ length: perPage }, (_, i) => ({
      id: `hit-${i}`,
      name: q ? `${q} Plugin ${i + 1}` : `Plugin ${(page - 1) * perPage + i + 1}`,
      slug: `plugin-${(page - 1) * perPage + i + 1}`,
      short_description: `A plugin for testing`,
      icon_url: null,
      author_username: "author-1",
      license: "MIT",
      downloads_total: (page * perPage + i) * 100,
      categories: category ? [category] : ["performance"],
      category_slugs: category ? [category] : ["performance"],
      pumpkin_versions: ["0.1.0", "0.2.0"],
      created_at_timestamp: Date.now() / 1000,
      updated_at_timestamp: Date.now() / 1000,
      average_rating: 4.0,
      review_count: 5,
    }));
    return HttpResponse.json({
      hits,
      query: q,
      processing_time_ms: 5,
      estimated_total_hits: 42,
      facet_distribution: { categories: { performance: 20, security: 12, "admin-tools": 10 }, pumpkin_versions: { "0.1.0": 25, "0.2.0": 17 } },
      page,
      per_page: perPage,
    });
  }),

  // ── Search suggestions ─────────────────────────────────────────────────
  http.get(`${API_BASE}/search/suggest`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? "5");
    const suggestions = Array.from({ length: Math.max(0, limit) }, (_, i) => ({
      name: `${q}-suggestion-${i + 1}`,
      slug: `${q}-${i + 1}`,
    }));
    return HttpResponse.json(suggestions);
  }),

  // ── Pumpkin versions ───────────────────────────────────────────────────
  http.get(`${API_BASE}/pumpkin-versions`, () =>
    HttpResponse.json([
      { version: "0.1.0", tag_name: "v0.1.0", published_at: "2025-01-01T00:00:00Z" },
      { version: "0.2.0", tag_name: "v0.2.0", published_at: "2025-03-01T00:00:00Z" },
      { version: "0.3.0", tag_name: "v0.3.0", published_at: "2025-06-01T00:00:00Z" },
    ]),
  ),

  // ── Auth / Me ──────────────────────────────────────────────────────────
  http.get(`${API_BASE}/auth/me`, () =>
    HttpResponse.json({
      id: "u-1",
      username: "testuser",
      display_name: "Test User",
      email: "test@example.com",
      avatar_url: null,
      bio: "A test user",
      role: "author",
      email_verified: true,
      created_at: "2025-01-01T00:00:00Z",
    }),
  ),
];
