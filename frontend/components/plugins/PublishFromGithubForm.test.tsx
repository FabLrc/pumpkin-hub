import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishFromGithubForm } from "./PublishFromGithubForm";

const {
  listMyGithubReposMock,
  publishPluginFromGithubMock,
  useCategoriesMock,
  toastMock,
} = vi.hoisted(() => ({
  listMyGithubReposMock: vi.fn(),
  publishPluginFromGithubMock: vi.fn(),
  useCategoriesMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  listMyGithubRepos: (...args: unknown[]) => listMyGithubReposMock(...args),
  publishPluginFromGithub: (...args: unknown[]) => publishPluginFromGithubMock(...args),
}));

vi.mock("@/lib/hooks", () => ({
  useCategories: () => useCategoriesMock(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/lib/category-icons", () => ({
  getCategoryIcon: () => {
    const MockIcon = (props: Record<string, unknown>) => <span data-testid="cat-icon" {...props} />;
    MockIcon.displayName = "MockIcon";
    return MockIcon;
  },
}));

const sampleRepos = [
  {
    full_name: "user/my-plugin",
    owner: "user",
    name: "my-plugin",
    description: "A cool plugin",
    default_branch: "main",
    installation_id: 100,
  },
  {
    full_name: "user/other-repo",
    owner: "user",
    name: "other-repo",
    description: null,
    default_branch: "develop",
    installation_id: 200,
  },
];

const sampleCategories = [
  { id: "cat1", name: "Gameplay", icon: "gamepad", description: "Gameplay plugins" },
  { id: "cat2", name: "Admin", icon: "shield", description: "Admin tools" },
  { id: "cat3", name: "Chat", icon: "message", description: null },
  { id: "cat4", name: "World", icon: "globe", description: null },
  { id: "cat5", name: "Economy", icon: "coins", description: null },
  { id: "cat6", name: "Extra", icon: "star", description: null },
];

describe("PublishFromGithubForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCategoriesMock.mockReturnValue({ data: sampleCategories });
  });

  it("shows 'Load my GitHub repositories' button initially", () => {
    render(<PublishFromGithubForm onSuccess={vi.fn()} />);
    expect(screen.getByText("Load my GitHub repositories")).toBeInTheDocument();
  });

  it("calls listMyGithubRepos when button clicked", async () => {
    const user = userEvent.setup();
    listMyGithubReposMock.mockResolvedValueOnce({ repositories: sampleRepos });

    render(<PublishFromGithubForm onSuccess={vi.fn()} />);
    await user.click(screen.getByText("Load my GitHub repositories"));

    await waitFor(() => {
      expect(listMyGithubReposMock).toHaveBeenCalled();
    });
  });

  it("shows repo list after loading", async () => {
    const user = userEvent.setup();
    listMyGithubReposMock.mockResolvedValueOnce({ repositories: sampleRepos });

    render(<PublishFromGithubForm onSuccess={vi.fn()} />);
    await user.click(screen.getByText("Load my GitHub repositories"));

    await waitFor(() => {
      expect(screen.getByText("user/my-plugin")).toBeInTheDocument();
      expect(screen.getByText("user/other-repo")).toBeInTheDocument();
    });
  });

  it("selecting repo auto-fills plugin name and description", async () => {
    const user = userEvent.setup();
    listMyGithubReposMock.mockResolvedValueOnce({ repositories: sampleRepos });

    render(<PublishFromGithubForm onSuccess={vi.fn()} />);
    await user.click(screen.getByText("Load my GitHub repositories"));

    await waitFor(() => {
      expect(screen.getByText("user/my-plugin")).toBeInTheDocument();
    });

    await user.click(screen.getByText("user/my-plugin"));

    // Name field should be filled with "my plugin" (dashes replaced with spaces)
    const nameInput = screen.getByDisplayValue("my plugin");
    expect(nameInput).toBeInTheDocument();

    // Description field should be filled
    const descInput = screen.getByDisplayValue("A cool plugin");
    expect(descInput).toBeInTheDocument();
  });

  it("category toggles work (max 5)", async () => {
    const user = userEvent.setup();
    listMyGithubReposMock.mockResolvedValueOnce({ repositories: sampleRepos });

    render(<PublishFromGithubForm onSuccess={vi.fn()} />);
    await user.click(screen.getByText("Load my GitHub repositories"));
    await waitFor(() => {
      expect(screen.getByText("user/my-plugin")).toBeInTheDocument();
    });
    await user.click(screen.getByText("user/my-plugin"));

    // Select 5 categories
    await user.click(screen.getByRole("button", { name: /gameplay/i }));
    await user.click(screen.getByRole("button", { name: /admin/i }));
    await user.click(screen.getByRole("button", { name: /chat/i }));
    await user.click(screen.getByRole("button", { name: /world/i }));
    await user.click(screen.getByRole("button", { name: /economy/i }));

    // 6th should be disabled
    const extraBtn = screen.getByRole("button", { name: /extra/i });
    expect(extraBtn).toBeDisabled();

    // Deselect one, then Extra should be enabled
    await user.click(screen.getByRole("button", { name: /gameplay/i }));
    expect(extraBtn).not.toBeDisabled();
  });

  it("sync toggle options default to checked", async () => {
    const user = userEvent.setup();
    listMyGithubReposMock.mockResolvedValueOnce({ repositories: sampleRepos });

    render(<PublishFromGithubForm onSuccess={vi.fn()} />);
    await user.click(screen.getByText("Load my GitHub repositories"));
    await waitFor(() => {
      expect(screen.getByText("user/my-plugin")).toBeInTheDocument();
    });
    await user.click(screen.getByText("user/my-plugin"));

    expect(screen.getAllByText("Auto-publish").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sync README")).toBeInTheDocument();
    expect(screen.getByText("Sync Changelog")).toBeInTheDocument();
  });

  it("submit calls publishPluginFromGithub with correct data", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    listMyGithubReposMock.mockResolvedValueOnce({ repositories: sampleRepos });
    publishPluginFromGithubMock.mockResolvedValueOnce({ plugin_slug: "my-plugin" });

    render(<PublishFromGithubForm onSuccess={onSuccess} />);
    await user.click(screen.getByText("Load my GitHub repositories"));
    await waitFor(() => {
      expect(screen.getByText("user/my-plugin")).toBeInTheDocument();
    });
    await user.click(screen.getByText("user/my-plugin"));

    // Select a category
    await user.click(screen.getByRole("button", { name: /gameplay/i }));

    // Submit form
    await user.click(screen.getByRole("button", { name: /publish from user\/my-plugin/i }));

    await waitFor(() => {
      expect(publishPluginFromGithubMock).toHaveBeenCalledWith({
        installation_id: 100,
        repository_owner: "user",
        repository_name: "my-plugin",
        plugin_name: "my plugin",
        short_description: "A cool plugin",
        category_ids: ["cat1"],
        sync_readme: true,
        sync_changelog: true,
        auto_publish: true,
      });
    });
  });

  it("calls onSuccess with returned slug on success", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    listMyGithubReposMock.mockResolvedValueOnce({ repositories: sampleRepos });
    publishPluginFromGithubMock.mockResolvedValueOnce({ plugin_slug: "published-slug" });

    render(<PublishFromGithubForm onSuccess={onSuccess} />);
    await user.click(screen.getByText("Load my GitHub repositories"));
    await waitFor(() => {
      expect(screen.getByText("user/my-plugin")).toBeInTheDocument();
    });
    await user.click(screen.getByText("user/my-plugin"));
    await user.click(screen.getByRole("button", { name: /publish from user\/my-plugin/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("published-slug");
      expect(toastMock.success).toHaveBeenCalledWith("Plugin published from GitHub!");
    });
  });
});
