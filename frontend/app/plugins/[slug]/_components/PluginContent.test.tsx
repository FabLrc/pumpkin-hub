import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import { PluginContent } from "./PluginContent";
import type { PluginResponse } from "@/lib/types";

/* ── Hoisted mocks ─────────────────────────────────────────────────────── */

const {
  usePluginVersionsMock,
  useCurrentUserMock,
  useBinariesMock,
  useDependenciesMock,
  useDependencyGraphMock,
  useDependantsMock,
  createVersionMock,
  declareDependencyMock,
  removeDependencyMock,
  swrMutateMock,
} = vi.hoisted(() => ({
  usePluginVersionsMock: vi.fn(),
  useCurrentUserMock: vi.fn(),
  useBinariesMock: vi.fn(),
  useDependenciesMock: vi.fn(),
  useDependencyGraphMock: vi.fn(),
  useDependantsMock: vi.fn(),
  createVersionMock: vi.fn(),
  declareDependencyMock: vi.fn(),
  removeDependencyMock: vi.fn(),
  swrMutateMock: vi.fn(),
}));

vi.mock("@/lib/hooks", () => ({
  usePluginVersions: (...a: unknown[]) => usePluginVersionsMock(...a),
  useCurrentUser: () => useCurrentUserMock(),
  useBinaries: (...a: unknown[]) => useBinariesMock(...a),
  useDependencies: (...a: unknown[]) => useDependenciesMock(...a),
  useDependencyGraph: (...a: unknown[]) => useDependencyGraphMock(...a),
  useDependants: (...a: unknown[]) => useDependantsMock(...a),
}));

vi.mock("@/lib/api", () => ({
  createVersion: (...a: unknown[]) => createVersionMock(...a),
  getPluginVersionsPath: (s: string) => `/plugins/${s}/versions`,
  getBinariesPath: (s: string, v: string) => `/plugins/${s}/versions/${v}/binaries`,
  declareDependency: (...a: unknown[]) => declareDependencyMock(...a),
  removeDependency: (...a: unknown[]) => removeDependencyMock(...a),
  getDependenciesPath: (s: string, v: string) => `/plugins/${s}/versions/${v}/dependencies`,
  getDependencyGraphPath: (s: string, v: string) => `/plugins/${s}/versions/${v}/graph`,
}));

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: (...a: unknown[]) => swrMutateMock(...a) };
});

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/plugins/VersionForm", () => ({
  VersionForm: ({ onSubmit, onCancel, isSubmitting }: {
    onSubmit: (data: { version: string; changelog: string; pumpkinVersionMin: string; pumpkinVersionMax: string }) => void;
    onCancel: () => void;
    isSubmitting: boolean;
  }) => (
    <div data-testid="version-form">
      <button onClick={() => onSubmit({ version: "2.0.0", changelog: "New", pumpkinVersionMin: "", pumpkinVersionMax: "" })}>
        submit-version
      </button>
      <button onClick={onCancel}>cancel-version</button>
      {isSubmitting && <span>submitting...</span>}
    </div>
  ),
}));

vi.mock("@/components/plugins/VersionManager", () => ({
  VersionManager: () => <div data-testid="version-manager" />,
}));

vi.mock("@/components/plugins/BinaryUpload", () => ({
  BinaryUpload: () => <div data-testid="binary-upload" />,
}));

vi.mock("@/components/plugins/BinaryList", () => ({
  BinaryList: () => <div data-testid="binary-list" />,
}));

vi.mock("@/components/reviews", () => ({
  ReviewSection: ({ plugin }: { plugin: PluginResponse }) => <div data-testid="review-section">{plugin.slug}</div>,
}));

vi.mock("@/components/plugins/GalleryTab", () => ({
  GalleryTab: ({ plugin }: { plugin: PluginResponse }) => <div data-testid="gallery-tab">{plugin.slug}</div>,
}));

vi.mock("@/components/plugins/ChangelogTab", () => ({
  ChangelogTab: ({ plugin }: { plugin: PluginResponse }) => <div data-testid="changelog-tab">{plugin.slug}</div>,
}));

/* ── Fixtures ──────────────────────────────────────────────────────────── */

const mockPlugin: PluginResponse = {
  id: "p1",
  name: "Test Plugin",
  slug: "test-plugin",
  short_description: "Short desc",
  icon_url: null,
  description: "## Heading\n\nHello `world`\n\n- item one\n* item two\n\n```\ncode block\n```\n\n### Sub heading\n\nParagraph with <b>html</b> & \"quotes\"",
  author: { id: "a1", username: "testuser", avatar_url: null },
  repository_url: "https://github.com/test/repo",
  documentation_url: null,
  license: "MIT",
  downloads_total: 1000,
  categories: [],
  average_rating: 0,
  review_count: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

const sampleVersions = [
  {
    id: "v1",
    version: "1.0.0",
    changelog: "Initial",
    pumpkin_version_min: "0.5.0",
    pumpkin_version_max: "1.0.0",
    downloads: 500,
    is_yanked: false,
    published_at: "2024-03-15T00:00:00Z",
  },
  {
    id: "v2",
    version: "0.9.0",
    changelog: null,
    pumpkin_version_min: "0.5.0",
    pumpkin_version_max: null,
    downloads: 200,
    is_yanked: true,
    published_at: "2024-02-01T00:00:00Z",
  },
];

/* ── Tests ─────────────────────────────────────────────────────────────── */

describe("PluginContent", () => {
  const onTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentUserMock.mockReturnValue({ data: { id: "a1", role: "author" } });
    usePluginVersionsMock.mockReturnValue({
      data: { versions: sampleVersions, total: 2 },
      isLoading: false,
      error: null,
    });
    useBinariesMock.mockReturnValue({ data: null, isLoading: false });
    useDependenciesMock.mockReturnValue({ data: { dependencies: [] }, isLoading: false });
    useDependencyGraphMock.mockReturnValue({ data: null, isLoading: false });
    useDependantsMock.mockReturnValue({ data: { dependants: [] }, isLoading: false });
  });

  // ── Tab bar ──
  it("renders all 6 tabs", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="overview" onTabChange={onTabChange} />);
    for (const label of ["Overview", "Versions", "Dependencies", "Gallery", "Changelog", "Reviews"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("active tab has active styling", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="overview" onTabChange={onTabChange} />);
    expect(screen.getByText("Overview").className).toContain("active");
    expect(screen.getByText("Versions").className).not.toContain("active");
  });

  it("clicking a tab calls onTabChange", async () => {
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="overview" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Versions"));
    expect(onTabChange).toHaveBeenCalledWith("versions");
  });

  // ── Overview tab ──
  it("renders formatted description with headings, lists, code", () => {
    const { container } = render(
      <PluginContent plugin={mockPlugin} activeTab="overview" onTabChange={onTabChange} />,
    );
    const md = container.querySelector(".md-content");
    expect(md!.querySelector("h2")).toBeInTheDocument();
    expect(md!.querySelector("h3")).toBeInTheDocument();
    expect(md!.querySelector("code")).toBeInTheDocument();
    expect(md!.querySelector("li")).toBeInTheDocument();
    expect(md!.querySelector("pre")).toBeInTheDocument();
  });

  it("escapes HTML entities in description", () => {
    const { container } = render(
      <PluginContent plugin={mockPlugin} activeTab="overview" onTabChange={onTabChange} />,
    );
    // The <b> tag should be escaped, not rendered as bold
    const html = container.querySelector(".md-content")!.innerHTML;
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("&amp;");
    // &quot; is decoded by the browser DOM, so check the raw escapeHtml output indirectly
    expect(html).not.toContain("<b>");
  });

  it("shows fallback when no description", () => {
    const noDesc = { ...mockPlugin, description: "" };
    render(<PluginContent plugin={noDesc} activeTab="overview" onTabChange={onTabChange} />);
    expect(screen.getByText(`About ${noDesc.name}`)).toBeInTheDocument();
    expect(screen.getByText("Short desc")).toBeInTheDocument();
  });

  it("shows default text when no description and no short_description", () => {
    const noDesc = { ...mockPlugin, description: "", short_description: null };
    render(<PluginContent plugin={noDesc} activeTab="overview" onTabChange={onTabChange} />);
    expect(screen.getByText(/No description provided yet/)).toBeInTheDocument();
  });

  it("handles unclosed code block in description", () => {
    const unclosed = { ...mockPlugin, description: "```\nunclosed code" };
    const { container } = render(
      <PluginContent plugin={unclosed} activeTab="overview" onTabChange={onTabChange} />,
    );
    expect(container.querySelector("pre")).toBeInTheDocument();
  });

  // ── Versions tab ──
  it("shows versions loading skeleton", () => {
    usePluginVersionsMock.mockReturnValue({ data: null, isLoading: true, error: null });
    const { container } = render(
      <PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows error when versions fail", () => {
    usePluginVersionsMock.mockReturnValue({ data: null, isLoading: false, error: new Error("fail") });
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText(/Failed to load versions/)).toBeInTheDocument();
  });

  it("shows empty state when no versions", () => {
    usePluginVersionsMock.mockReturnValue({
      data: { versions: [], total: 0 }, isLoading: false, error: null,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText("No versions published yet.")).toBeInTheDocument();
  });

  it("shows Publish First Version for owner when no versions", () => {
    usePluginVersionsMock.mockReturnValue({
      data: { versions: [], total: 0 }, isLoading: false, error: null,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText("Publish First Version")).toBeInTheDocument();
  });

  it("does not show Publish First Version for non-owner", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "other", role: "author" } });
    usePluginVersionsMock.mockReturnValue({
      data: { versions: [], total: 0 }, isLoading: false, error: null,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.queryByText("Publish First Version")).not.toBeInTheDocument();
  });

  it("shows version rows with release count and badges", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText(/2 releases/)).toBeInTheDocument();
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(screen.getByText("LATEST")).toBeInTheDocument();
    expect(screen.getByText("YANKED")).toBeInTheDocument();
  });

  it("shows compatibility range formats", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText("0.5.0 — 1.0.0")).toBeInTheDocument(); // min+max
    expect(screen.getByText("≥ 0.5.0")).toBeInTheDocument(); // min only
  });

  it("shows 'Any' when no compat range", () => {
    usePluginVersionsMock.mockReturnValue({
      data: {
        versions: [{
          id: "v3", version: "3.0.0", changelog: null,
          pumpkin_version_min: null, pumpkin_version_max: null,
          downloads: 0, is_yanked: false, published_at: "2024-01-01T00:00:00Z",
        }],
        total: 1,
      },
      isLoading: false, error: null,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText("Any")).toBeInTheDocument();
  });

  it("shows '≤ max' when only max set", () => {
    usePluginVersionsMock.mockReturnValue({
      data: {
        versions: [{
          id: "v4", version: "4.0.0", changelog: null,
          pumpkin_version_min: null, pumpkin_version_max: "2.0.0",
          downloads: 0, is_yanked: false, published_at: "2024-01-01T00:00:00Z",
        }],
        total: 1,
      },
      isLoading: false, error: null,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText("≤ 2.0.0")).toBeInTheDocument();
  });

  it("expands version row to show binaries", async () => {
    useBinariesMock.mockReturnValue({ data: { binaries: [] }, isLoading: false });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    await user.click(screen.getByText("1.0.0").closest<HTMLElement>(".ver-row") as HTMLElement);
    expect(screen.getByText("Binaries")).toBeInTheDocument();
    expect(screen.getByTestId("binary-list")).toBeInTheDocument();
    expect(screen.getByTestId("binary-upload")).toBeInTheDocument();
  });

  it("shows binaries loading skeleton when expanding", async () => {
    useBinariesMock.mockReturnValue({ data: null, isLoading: true });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    await user.click(screen.getByText("1.0.0").closest<HTMLElement>(".ver-row") as HTMLElement);
    // Should have pulse skeleton inside expanded panel
    const panel = screen.getByText("Binaries").closest("div");
    expect(panel?.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("publish form opens and submits", async () => {
    createVersionMock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Publish Version"));
    expect(screen.getByTestId("version-form")).toBeInTheDocument();
    await user.click(screen.getByText("submit-version"));
    await waitFor(() => {
      expect(createVersionMock).toHaveBeenCalled();
    });
  });

  it("publish form cancel hides form", async () => {
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Publish Version"));
    expect(screen.getByTestId("version-form")).toBeInTheDocument();
    await user.click(screen.getByText("cancel-version"));
    expect(screen.queryByTestId("version-form")).not.toBeInTheDocument();
  });

  it("singular release text for 1 version", () => {
    usePluginVersionsMock.mockReturnValue({
      data: { versions: [sampleVersions[0]], total: 1 },
      isLoading: false, error: null,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="versions" onTabChange={onTabChange} />);
    expect(screen.getByText(/1 release(?!s)/)).toBeInTheDocument();
  });

  // ── Dependencies tab ──
  it("shows message when no versions for deps", () => {
    usePluginVersionsMock.mockReturnValue({
      data: { versions: [], total: 0 }, isLoading: false, error: null,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    expect(screen.getByText(/Dependencies can be declared after publishing/)).toBeInTheDocument();
  });

  it("shows dependency list with zero deps", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    expect(screen.getByText(/0 dependencies/)).toBeInTheDocument();
  });

  it("shows dep sub-navigation buttons", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    expect(screen.getByText("Graph")).toBeInTheDocument();
    expect(screen.getByText("Dependants")).toBeInTheDocument();
  });

  it("switches to dependants view", async () => {
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Dependants"));
    expect(screen.getByText(/0 plugins depend/)).toBeInTheDocument();
  });

  it("switches to graph view with empty graph", async () => {
    useDependencyGraphMock.mockReturnValue({
      data: { graph: [], conflicts: [] }, isLoading: false,
    });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Graph"));
    expect(screen.getByText("No dependencies to visualize.")).toBeInTheDocument();
  });

  it("shows graph tree with nodes", async () => {
    useDependencyGraphMock.mockReturnValue({
      data: {
        graph: [
          {
            plugin_id: "p1", plugin_slug: "test-plugin", plugin_name: "Test Plugin", version: "1.0.0",
            dependencies: [{
              dependency_plugin_id: "p2", dependency_plugin_slug: "dep-plugin",
              dependency_plugin_name: "Dep Plugin", version_req: "^1.0",
              resolved_version: "1.2.0", is_compatible: true, is_optional: false,
            }],
          },
        ],
        conflicts: [],
      },
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Graph"));
    expect(screen.getByText("Dependency Tree")).toBeInTheDocument();
    expect(screen.getByText("Dep Plugin")).toBeInTheDocument();
  });

  it("shows graph with unresolved and optional leaf edges", async () => {
    useDependencyGraphMock.mockReturnValue({
      data: {
        graph: [
          {
            plugin_id: "p1", plugin_slug: "test-plugin", plugin_name: "Test Plugin", version: "1.0.0",
            dependencies: [
              {
                dependency_plugin_id: "p2", dependency_plugin_slug: "missing",
                dependency_plugin_name: "Missing", version_req: "^2.0",
                resolved_version: null, is_compatible: false, is_optional: true,
              },
            ],
          },
        ],
        conflicts: [],
      },
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Graph"));
    expect(screen.getByText("UNRESOLVED")).toBeInTheDocument();
    expect(screen.getByText("optional")).toBeInTheDocument();
  });

  it("shows conflict alerts", async () => {
    useDependencyGraphMock.mockReturnValue({
      data: {
        graph: [],
        conflicts: [
          { conflict_type: "no_matching_version", dependency_plugin_name: "Broken", details: "No match" },
          { conflict_type: "circular_dependency", dependency_plugin_name: "Loop", details: "Circular" },
        ],
      },
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Graph"));
    expect(screen.getByText("2 conflicts detected")).toBeInTheDocument();
    expect(screen.getByText("Broken")).toBeInTheDocument();
  });

  it("shows graph loading skeleton", async () => {
    useDependencyGraphMock.mockReturnValue({ data: null, isLoading: true });
    const user = userEvent.setup();
    const { container } = render(
      <PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />,
    );
    await user.click(screen.getByText("Graph"));
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows graph error state", async () => {
    useDependencyGraphMock.mockReturnValue({ data: null, isLoading: false });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Graph"));
    expect(screen.getByText("Failed to load dependency graph.")).toBeInTheDocument();
  });

  it("shows dependants with items", async () => {
    useDependantsMock.mockReturnValue({
      data: {
        dependants: [{
          plugin_id: "p3", plugin_slug: "consumer", plugin_name: "Consumer",
          version: "2.0.0", version_req: "^1.0.0", is_optional: true,
        }],
      },
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Dependants"));
    expect(screen.getByText("Consumer")).toBeInTheDocument();
    expect(screen.getByText(/requires \^1\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(screen.getByText("1 plugin depends on this plugin")).toBeInTheDocument();
  });

  it("shows dependants loading skeleton", async () => {
    useDependantsMock.mockReturnValue({ data: null, isLoading: true });
    const user = userEvent.setup();
    const { container } = render(
      <PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />,
    );
    await user.click(screen.getByText("Dependants"));
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows Add dependency form and validates", async () => {
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Add dependency"));
    expect(screen.getByText("Declare dependency")).toBeInTheDocument();

    // Empty submit
    await user.click(screen.getByText("Add Dependency"));
    expect(screen.getByText("Plugin ID is required")).toBeInTheDocument();
  });

  it("validates self-dependency", async () => {
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Add dependency"));
    await user.type(screen.getByPlaceholderText(/e.g. 550e8400/), "p1");
    await user.click(screen.getByText("Add Dependency"));
    expect(screen.getByText("A plugin cannot depend on itself")).toBeInTheDocument();
  });

  it("submits add dependency form", async () => {
    declareDependencyMock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Add dependency"));
    await user.type(screen.getByPlaceholderText(/e.g. 550e8400/), "p2");
    await user.click(screen.getByText("Add Dependency"));
    await waitFor(() => {
      expect(declareDependencyMock).toHaveBeenCalledWith("test-plugin", "1.0.0", {
        dependency_plugin_id: "p2",
        version_req: "^1.0.0",
        is_optional: false,
      });
    });
  });

  it("shows error when add dependency fails", async () => {
    declareDependencyMock.mockRejectedValueOnce(new Error("Conflict"));
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Add dependency"));
    await user.type(screen.getByPlaceholderText(/e.g. 550e8400/), "p2");
    await user.click(screen.getByText("Add Dependency"));
    await waitFor(() => {
      expect(screen.getByText("Conflict")).toBeInTheDocument();
    });
  });

  it("cancel closes add dependency form", async () => {
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    await user.click(screen.getByText("Add dependency"));
    expect(screen.getByText("Declare dependency")).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Declare dependency")).not.toBeInTheDocument();
  });

  it("shows dependency list with items and optional badge", () => {
    useDependenciesMock.mockReturnValue({
      data: {
        dependencies: [{
          id: "d1",
          dependency_plugin: { slug: "dep-a", name: "Dep A" },
          version_req: "^1.0",
          is_optional: true,
        }],
      },
      isLoading: false,
    });
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    expect(screen.getByText("Dep A")).toBeInTheDocument();
    expect(screen.getByText("optional")).toBeInTheDocument();
  });

  it("dependency loading shows skeleton", () => {
    useDependenciesMock.mockReturnValue({ data: null, isLoading: true });
    const { container } = render(
      <PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("remove dependency calls removeDependency", async () => {
    removeDependencyMock.mockResolvedValueOnce({});
    useDependenciesMock.mockReturnValue({
      data: {
        dependencies: [{
          id: "d1",
          dependency_plugin: { slug: "dep-a", name: "Dep A" },
          version_req: "^1.0",
          is_optional: false,
        }],
      },
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<PluginContent plugin={mockPlugin} activeTab="dependencies" onTabChange={onTabChange} />);
    // Click the X button to remove
    const depCard = screen.getByText("Dep A").closest<HTMLElement>(".dep-card") as HTMLElement;
    const removeBtn = depCard.querySelector("button") as HTMLElement;
    await user.click(removeBtn);
    await waitFor(() => {
      expect(removeDependencyMock).toHaveBeenCalledWith("test-plugin", "1.0.0", "d1");
    });
  });

  // ── Delegate tabs ──
  it("renders gallery tab", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="gallery" onTabChange={onTabChange} />);
    expect(screen.getByTestId("gallery-tab")).toBeInTheDocument();
  });

  it("renders changelog tab", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="changelog" onTabChange={onTabChange} />);
    expect(screen.getByTestId("changelog-tab")).toBeInTheDocument();
  });

  it("renders reviews tab", () => {
    render(<PluginContent plugin={mockPlugin} activeTab="reviews" onTabChange={onTabChange} />);
    expect(screen.getByTestId("review-section")).toBeInTheDocument();
  });
});
