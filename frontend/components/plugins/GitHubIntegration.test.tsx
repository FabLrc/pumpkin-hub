import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GitHubIntegration } from "./GitHubIntegration";

const {
  useGithubLinkMock,
  linkGithubMock,
  unlinkGithubMock,
  listMyGithubReposMock,
  swrMutateMock,
  toastMock,
} = vi.hoisted(() => ({
  useGithubLinkMock: vi.fn(),
  linkGithubMock: vi.fn(),
  unlinkGithubMock: vi.fn(),
  listMyGithubReposMock: vi.fn(),
  swrMutateMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/hooks", () => ({
  useGithubLink: (...args: unknown[]) => useGithubLinkMock(...args),
}));

vi.mock("@/lib/api", () => ({
  linkGithub: (...args: unknown[]) => linkGithubMock(...args),
  unlinkGithub: (...args: unknown[]) => unlinkGithubMock(...args),
  getGithubLinkPath: (slug: string) => `/plugins/${slug}/github`,
  getPluginBadgeUrl: (slug: string) => `http://localhost:8080/api/v1/plugins/${slug}/badge.svg`,
  listMyGithubRepos: (...args: unknown[]) => listMyGithubReposMock(...args),
}));

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: (...args: unknown[]) => swrMutateMock(...args) };
});

vi.mock("sonner", () => ({
  toast: toastMock,
}));

const linkedData = {
  repository_full_name: "user/repo",
  default_branch: "main",
  auto_publish: true,
  sync_readme: true,
  sync_changelog: false,
};

describe("GitHubIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton when isLoading", () => {
    useGithubLinkMock.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
    const { container } = render(<GitHubIntegration slug="my-plugin" />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("shows linked state with repo name when linked", () => {
    useGithubLinkMock.mockReturnValue({ data: linkedData, error: undefined, isLoading: false });
    render(<GitHubIntegration slug="my-plugin" />);
    expect(screen.getByText("user/repo")).toBeInTheDocument();
    expect(screen.getByText("Connected Repository")).toBeInTheDocument();
    expect(screen.getByText(/Branch: main/)).toBeInTheDocument();
  });

  it("shows unlinked state with load repos button when not linked", () => {
    useGithubLinkMock.mockReturnValue({ data: undefined, error: new Error("404"), isLoading: false });
    render(<GitHubIntegration slug="my-plugin" />);
    expect(screen.getByText("Load my GitHub repositories")).toBeInTheDocument();
  });

  it("badge section shows in linked state", () => {
    useGithubLinkMock.mockReturnValue({ data: linkedData, error: undefined, isLoading: false });
    render(<GitHubIntegration slug="my-plugin" />);
    expect(screen.getByText("Badge")).toBeInTheDocument();
    expect(screen.getByText("Copy Markdown")).toBeInTheDocument();
  });

  it("copy badge markdown to clipboard", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    // Use setup without clipboard to allow our mock to work
    const user = userEvent.setup({ writeToClipboard: false });
    useGithubLinkMock.mockReturnValue({ data: linkedData, error: undefined, isLoading: false });

    render(<GitHubIntegration slug="my-plugin" />);
    await user.click(screen.getByText("Copy Markdown"));

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith(
        "Badge markdown copied to clipboard",
      );
    });
  });

  it("unlink calls unlinkGithub", async () => {
    const user = userEvent.setup();
    useGithubLinkMock.mockReturnValue({ data: linkedData, error: undefined, isLoading: false });
    unlinkGithubMock.mockResolvedValueOnce(undefined);
    swrMutateMock.mockResolvedValueOnce(undefined);

    render(<GitHubIntegration slug="my-plugin" />);
    await user.click(screen.getByRole("button", { name: /disconnect repository/i }));

    await waitFor(() => {
      expect(unlinkGithubMock).toHaveBeenCalledWith("my-plugin");
      expect(toastMock.success).toHaveBeenCalledWith("Repository unlinked successfully");
    });
  });

  it("load repos calls listMyGithubRepos", async () => {
    const user = userEvent.setup();
    useGithubLinkMock.mockReturnValue({ data: undefined, error: new Error("404"), isLoading: false });
    listMyGithubReposMock.mockResolvedValueOnce({
      repositories: [
        {
          full_name: "user/my-repo",
          owner: "user",
          name: "my-repo",
          description: "A cool repo",
          default_branch: "main",
          installation_id: 123,
        },
      ],
    });

    render(<GitHubIntegration slug="my-plugin" />);
    await user.click(screen.getByText("Load my GitHub repositories"));

    await waitFor(() => {
      expect(listMyGithubReposMock).toHaveBeenCalled();
    });
  });

  it("repo picker shows repos after loading", async () => {
    const user = userEvent.setup();
    useGithubLinkMock.mockReturnValue({ data: undefined, error: new Error("404"), isLoading: false });
    listMyGithubReposMock.mockResolvedValueOnce({
      repositories: [
        {
          full_name: "user/my-repo",
          owner: "user",
          name: "my-repo",
          description: "A cool repo",
          default_branch: "main",
          installation_id: 123,
        },
      ],
    });

    render(<GitHubIntegration slug="my-plugin" />);
    await user.click(screen.getByText("Load my GitHub repositories"));

    await waitFor(() => {
      expect(screen.getByText("user/my-repo")).toBeInTheDocument();
    });
    expect(screen.getByText("A cool repo")).toBeInTheDocument();
  });

  it("link button submits form with selected repo", async () => {
    const user = userEvent.setup();
    useGithubLinkMock.mockReturnValue({ data: undefined, error: new Error("404"), isLoading: false });
    listMyGithubReposMock.mockResolvedValueOnce({
      repositories: [
        {
          full_name: "user/my-repo",
          owner: "user",
          name: "my-repo",
          description: null,
          default_branch: "main",
          installation_id: 456,
        },
      ],
    });
    linkGithubMock.mockResolvedValueOnce({});
    swrMutateMock.mockResolvedValueOnce(undefined);

    render(<GitHubIntegration slug="my-plugin" />);
    await user.click(screen.getByText("Load my GitHub repositories"));

    await waitFor(() => {
      expect(screen.getByText("user/my-repo")).toBeInTheDocument();
    });

    await user.click(screen.getByText("user/my-repo"));

    await user.click(screen.getByRole("button", { name: /connect user\/my-repo/i }));

    await waitFor(() => {
      expect(linkGithubMock).toHaveBeenCalledWith("my-plugin", {
        installation_id: 456,
        repository_owner: "user",
        repository_name: "my-repo",
        sync_readme: true,
        sync_changelog: true,
        auto_publish: true,
      });
      expect(toastMock.success).toHaveBeenCalledWith("Repository linked successfully");
    });
  });
});
