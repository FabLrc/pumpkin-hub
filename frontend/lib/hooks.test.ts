import { describe, it, expect, vi, beforeEach } from "vitest";
import useSWR from "swr";
import {
  useApiKeys,
  useAuthorDashboardStats,
  useAuthorDownloads,
  useAuthorPlugins,
  useBinaries,
  useCategories,
  useChangelog,
  useCurrentUser,
  useDependencies,
  useDependants,
  useDependencyGraph,
  useGithubLink,
  useMedia,
  useNotifications,
  usePlugin,
  usePluginDownloadStats,
  usePlugins,
  usePluginVersions,
  usePumpkinVersions,
  useReviews,
  useSearch,
  useUnreadCount,
} from "./hooks";

vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

function getCall(index = 0) {
  return vi.mocked(useSWR).mock.calls[index];
}

describe("lib/hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds swr key for plugins and plugin details", () => {
    usePlugins({ page: 2, per_page: 50, category: "security" });
    usePlugin("my-plugin");
    usePlugin(null);
    usePluginVersions("my-plugin");

    expect(getCall(0)[0]).toContain("/plugins?page=2");
    expect(getCall(1)[0]).toBe("/plugins/my-plugin");
    expect(getCall(2)[0]).toBeNull();
    expect(getCall(3)[0]).toBe("/plugins/my-plugin/versions");
  });

  it("configures common collection hooks", () => {
    useCategories();
    useCurrentUser();
    useAuthorPlugins("fab");
    useBinaries("my-plugin", "1.0.0");
    useSearch({ q: "auth", page: 1, per_page: 20 });
    usePumpkinVersions();

    expect(getCall(0)[0]).toBe("/categories");
    expect(getCall(0)[2]).toMatchObject({ revalidateOnFocus: false });

    expect(getCall(1)[0]).toBe("/auth/me");
    expect(getCall(1)[2]).toMatchObject({ shouldRetryOnError: false });

    expect(getCall(2)[0]).toContain("author=fab");
    expect(getCall(3)[0]).toBe("/plugins/my-plugin/versions/1.0.0/binaries");

    expect(getCall(4)[0]).toContain("/search?");
    expect(getCall(4)[2]).toMatchObject({ keepPreviousData: true });

    expect(getCall(5)[0]).toBe("/pumpkin-versions");
  });

  it("handles dependency hook keys and null guards", () => {
    useDependencies("plug", "1.2.3");
    useDependencies("plug", null);
    useDependencyGraph("plug", "1.2.3");
    useDependants("plug");

    expect(getCall(0)[0]).toBe("/plugins/plug/versions/1.2.3/dependencies");
    expect(getCall(1)[0]).toBeNull();
    expect(getCall(2)[0]).toContain("/dependencies/graph");
    expect(getCall(3)[0]).toBe("/plugins/plug/dependants");
  });

  it("builds dashboard and api-key hooks", () => {
    useAuthorDashboardStats("weekly", 8);
    useAuthorDownloads("daily", 30);
    usePluginDownloadStats("my-plugin", "monthly", 12);
    usePluginDownloadStats(null, "monthly", 12);
    useApiKeys();

    expect(getCall(0)[0]).toBe("/dashboard/stats?granularity=weekly&periods=8");
    expect(getCall(1)[0]).toBe("/dashboard/downloads?granularity=daily&periods=30");
    expect(getCall(2)[0]).toBe("/plugins/my-plugin/download-stats?granularity=monthly&periods=12");
    expect(getCall(3)[0]).toBeNull();
    expect(getCall(4)[0]).toBe("/api-keys");
  });

  it("builds notifications and github hooks", () => {
    useNotifications(3, 25, true);
    useUnreadCount();
    useGithubLink("slug");
    useGithubLink(null);

    expect(getCall(0)[0]).toBe("/notifications?page=3&per_page=25&unread_only=true");
    expect(getCall(0)[2]).toMatchObject({ refreshInterval: 30000 });

    expect(getCall(1)[0]).toBe("/notifications/unread-count");
    expect(getCall(1)[2]).toMatchObject({ shouldRetryOnError: false });

    expect(getCall(2)[0]).toBe("/plugins/slug/github");
    expect(getCall(3)[0]).toBeNull();
  });

  it("builds review/media/changelog keys", () => {
    useReviews("slug", 2, 10);
    useMedia("slug");
    useMedia(null);
    useChangelog("slug");

    expect(getCall(0)[0]).toBe("/plugins/slug/reviews?page=2&per_page=10");
    expect(getCall(1)[0]).toBe("/plugins/slug/media");
    expect(getCall(2)[0]).toBeNull();
    expect(getCall(3)[0]).toBe("/plugins/slug/changelog");
  });
});
