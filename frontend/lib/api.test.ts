import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";

type MockResponseInit = {
  ok?: boolean;
  status?: number;
  jsonData?: unknown;
  textData?: string;
};

function createMockResponse({
  ok = true,
  status = 200,
  jsonData = {},
  textData = "",
}: MockResponseInit = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(jsonData),
    text: vi.fn().mockResolvedValue(textData),
  } as unknown as Response;
}

class MockXMLHttpRequest {
  static nextStatus = 200;
  static nextResponseText = '{"binary":{"checksum_sha256":"abc"}}';
  static shouldError = false;

  method = "";
  url = "";
  withCredentials = false;
  status = 0;
  responseText = "";
  upload = {
    addEventListener: vi.fn((event: string, cb: (e: { lengthComputable: boolean; loaded: number; total: number }) => void) => {
      if (event === "progress") {
        cb({ lengthComputable: true, loaded: 50, total: 100 });
      }
    }),
  };

  private listeners = new Map<string, () => void>();

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  addEventListener(event: string, cb: () => void) {
    this.listeners.set(event, cb);
  }

  set onload(cb: () => void) {
    this.listeners.set("load", cb);
  }

  set onerror(cb: () => void) {
    this.listeners.set("error", cb);
  }

  send(_body: FormData) {
    this.status = MockXMLHttpRequest.nextStatus;
    this.responseText = MockXMLHttpRequest.nextResponseText;

    if (MockXMLHttpRequest.shouldError) {
      this.listeners.get("error")?.();
      return;
    }

    this.listeners.get("load")?.();
  }
}

describe("lib/api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest as unknown as typeof XMLHttpRequest);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse()));
    MockXMLHttpRequest.nextStatus = 200;
    MockXMLHttpRequest.nextResponseText = '{"binary":{"checksum_sha256":"abc"}}';
    MockXMLHttpRequest.shouldError = false;
  });

  it("builds plugin, search and helper paths", () => {
    expect(api.getPluginsPath()).toBe("/plugins");
    expect(api.getPluginsPath({ page: 2, per_page: 25, category: "security" })).toContain("page=2");
    expect(api.getPluginPath("my-slug")).toBe("/plugins/my-slug");
    expect(api.getPluginVersionPath("my slug", "1.0.0+meta")).toBe("/plugins/my%20slug/versions/1.0.0%2Bmeta");

    expect(api.getSearchPath({ q: "auth", page: 3, per_page: 10 })).toContain("q=auth");
    expect(api.getSuggestPath("pumpkin hub", 5)).toBe("/search/suggest?q=pumpkin+hub&limit=5");

    expect(api.getDependenciesPath("slug", "1.0.0")).toBe("/plugins/slug/versions/1.0.0/dependencies");
    expect(api.getDependencyGraphPath("slug", "1.0.0")).toContain("/dependencies/graph");
    expect(api.getDependantsPath("slug")).toBe("/plugins/slug/dependants");

    expect(api.getDashboardStatsPath("weekly", 8)).toBe("/dashboard/stats?granularity=weekly&periods=8");
    expect(api.getDashboardDownloadsPath("daily", 30)).toBe("/dashboard/downloads?granularity=daily&periods=30");
    expect(api.getPluginDownloadStatsPath("plug in", "monthly", 12)).toBe("/plugins/plug%20in/download-stats?granularity=monthly&periods=12");

    expect(api.getNotificationsPath(2, 15, true)).toBe("/notifications?page=2&per_page=15&unread_only=true");
    expect(api.getUnreadCountPath()).toBe("/notifications/unread-count");

    expect(api.getGithubLoginUrl()).toContain("/api/v1/auth/github");
    expect(api.getOAuthLoginUrl("google")).toContain("/api/v1/auth/google");
    expect(api.getPluginBadgeUrl("my plugin")).toContain("/plugins/my%20plugin/badge.svg");
    expect(api.getMediaPath("my plugin")).toBe("/plugins/my%20plugin/media");
    expect(api.getChangelogPath("my plugin")).toBe("/plugins/my%20plugin/changelog");
  });

  it("calls fetch wrappers with expected methods and paths", async () => {
    const fetchMock = vi.mocked(fetch);

    await api.fetchPlugins({ page: 1 });
    await api.fetchPlugin("my-plugin");
    await api.createPlugin({ name: "n", description: "d", category_ids: [] });
    await api.updatePlugin("my plugin", { name: "new" });
    await api.deletePlugin("my plugin");

    await api.fetchPluginVersions("slug");
    await api.fetchPluginVersion("slug", "1.0.0");
    await api.createVersion("slug", { version: "1.0.0" });
    await api.yankVersion("slug", "1.0.0", { yanked: true });

    await api.fetchCategories();
    await api.logout();
    await api.fetchCurrentUser();
    await api.updateProfile({ username: "newname" });

    await api.registerWithEmail({ username: "u", email: "u@example.com", password: "secret123" });
    await api.loginWithEmail({ email: "u@example.com", password: "secret123" });
    await api.forgotPassword("u@example.com");
    await api.resetPassword("token", "newpass");
    await api.verifyEmail("verify-token");
    await api.resendVerification();

    await api.fetchBinaries("slug", "1.0.0");
    await api.fetchBinaryDownload("slug", "1.0.0", "linux");

    await api.fetchSearch({ q: "auth" });
    await api.fetchSuggestions("query", 7);
    await api.fetchPumpkinVersions();

    await api.fetchDependencies("slug", "1.0.0");
    await api.declareDependency("slug", "1.0.0", { dependency_plugin_slug: "dep", version_constraint: "^1.0.0", optional: false });
    await api.updateDependency("slug", "1.0.0", "dep-id", { version_constraint: "~1.2.0", optional: true });
    await api.removeDependency("slug", "1.0.0", "dep-id");
    await api.fetchDependencyGraph("slug", "1.0.0");
    await api.fetchDependants("slug");

    await api.fetchAuthorProfile("author");
    await api.fetchAuthorPlugins("author", 2, 20);

    await api.fetchAdminStats();
    await api.fetchAdminPlugins(1, 10, "search");
    await api.deactivatePlugin("pid");
    await api.reactivatePlugin("pid");
    await api.fetchAdminUsers(1, 10, "search");
    await api.changeUserRole("uid", "admin");
    await api.deactivateUser("uid");
    await api.reactivateUser("uid");
    await api.fetchAuditLogs(1, 20);

    await api.createApiKey({ name: "ci" });
    await api.revokeApiKey("k-1");

    await api.markNotificationRead("n-1");
    await api.markAllNotificationsRead();

    await api.linkGithub("slug", { repository_id: 1, repository_full_name: "org/repo", installation_id: 12 });
    await api.unlinkGithub("slug");
    await api.listInstallationRepos(22);
    await api.publishPluginFromGithub({ repository_id: 1, repository_full_name: "org/repo" });
    await api.listMyGithubRepos();

    await api.fetchReviews("slug", 1, 10);
    await api.createReview("slug", { rating: 5, title: "great", body: "works" });
    await api.updateReview("slug", "r1", { rating: 4, title: "upd", body: "still good" });
    await api.deleteReview("slug", "r1");
    await api.toggleReviewVisibility("slug", "r1", true);
    await api.reportReview("slug", "r1", { reason: "spam", details: "bot" });

    await api.fetchMedia("slug");
    await api.updateMedia("slug", "m1", { caption: "updated" });
    await api.deleteMedia("slug", "m1");
    await api.reorderMedia("slug", { media_ids: ["m1", "m2"] });

    await api.fetchChangelog("slug");
    await api.updateChangelog("slug", { content: "# Changelog" });
    await api.deleteChangelog("slug");

    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/plugins?page=1"),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/plugins/my%20plugin"),
      expect.objectContaining({ method: "PUT" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/login"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/plugins/slug/reviews/r1/hide"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("throws a rich API error on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createMockResponse({ ok: false, status: 422, textData: "validation failed" }),
    );

    await expect(api.fetchPlugins()).rejects.toThrow("API 422: validation failed");
  });

  it("uses swrFetcher as thin proxy", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createMockResponse({ jsonData: { ok: true } }),
    );

    const result = await api.swrFetcher<{ ok: boolean }>("/plugins");
    expect(result.ok).toBe(true);
  });

  it("uploads avatar with FormData and credentials include", async () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await api.uploadAvatar(file);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/avatar"),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("throws avatar error with response payload text", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      createMockResponse({ ok: false, status: 500, textData: "upload failed" }),
    );

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await expect(api.uploadAvatar(file)).rejects.toThrow("API 500: upload failed");
  });

  it("uploads binary via XHR and forwards progress", async () => {
    const onProgress = vi.fn();
    const file = new File(["bin"], "plugin.so");

    const res = await api.uploadBinary("slug name", "1.0.0", file, "linux", onProgress);

    expect(res.binary.checksum_sha256).toBe("abc");
    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it("rejects binary upload on XHR error status", async () => {
    MockXMLHttpRequest.nextStatus = 400;
    MockXMLHttpRequest.nextResponseText = "bad request";

    const file = new File(["bin"], "plugin.so");
    await expect(api.uploadBinary("slug", "1.0.0", file, "linux")).rejects.toThrow("API 400: bad request");
  });

  it("rejects binary upload on network error", async () => {
    MockXMLHttpRequest.shouldError = true;

    const file = new File(["bin"], "plugin.so");
    await expect(api.uploadBinary("slug", "1.0.0", file, "linux")).rejects.toThrow("Network error during binary upload");
  });

  it("uploads media with xhr and credentials enabled", async () => {
    MockXMLHttpRequest.nextResponseText = '{"media":{"id":"m1"}}';

    const onProgress = vi.fn();
    const file = new File(["img"], "preview.png");
    const result = await api.uploadMedia("slug", file, "caption", onProgress);

    expect((result as { media: { id: string } }).media.id).toBe("m1");
    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it("rejects media upload on status error", async () => {
    MockXMLHttpRequest.nextStatus = 413;
    MockXMLHttpRequest.nextResponseText = "too large";

    const file = new File(["img"], "preview.png");
    await expect(api.uploadMedia("slug", file)).rejects.toThrow("Upload failed: 413 too large");
  });

  it("rejects media upload on network error", async () => {
    MockXMLHttpRequest.shouldError = true;

    const file = new File(["img"], "preview.png");
    await expect(api.uploadMedia("slug", file)).rejects.toThrow("Network error during upload");
  });
});
