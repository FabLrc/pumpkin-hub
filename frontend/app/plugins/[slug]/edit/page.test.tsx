import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import type { ComponentPropsWithoutRef } from "react";
import EditPluginPage from "./page";
import type { PluginResponse } from "@/lib/types";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const useCurrentUserMock = vi.fn();
const usePluginMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: (...args: unknown[]) => useCurrentUserMock(...args),
  usePlugin: (...args: unknown[]) => usePluginMock(...args),
}));

const { updatePluginMock, uploadPluginIconMock, deletePluginIconMock } = vi.hoisted(() => ({
  updatePluginMock: vi.fn(),
  uploadPluginIconMock: vi.fn(),
  deletePluginIconMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  updatePlugin: updatePluginMock,
  getPluginPath: vi.fn().mockReturnValue("/api/v1/plugins/test-plugin"),
  uploadPluginIcon: uploadPluginIconMock,
  deletePluginIcon: deletePluginIconMock,
}));

vi.mock("swr", () => ({
  mutate: vi.fn(),
}));

vi.mock("@/components/plugins/PluginForm", () => ({
  PluginForm: (props: {
    submitLabel?: string;
    initialData?: { name: string };
    onSubmit?: (data: Record<string, unknown>) => void;
    isSubmitting?: boolean;
  }) => (
    <div data-testid="plugin-form" data-label={props.submitLabel}>
      PluginForm
      {props.initialData && (
        <span data-testid="initial-data">{props.initialData.name}</span>
      )}
      <button
        type="button"
        data-testid="submit-form"
        onClick={() =>
          props.onSubmit?.({
            name: "Updated",
            shortDescription: "",
            description: "",
            repositoryUrl: "",
            documentationUrl: "",
            license: "",
            categoryIds: [],
          })
        }
      >
        Submit
      </button>
    </div>
  ),
}));

vi.mock("@/components/plugins/GitHubIntegration", () => ({
  GitHubIntegration: ({ slug }: { slug: string }) => (
    <div data-testid="github-integration">{slug}</div>
  ),
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

const mockPlugin: PluginResponse = {
  id: "p1",
  name: "Test Plugin",
  slug: "test-plugin",
  short_description: "A great test plugin",
  icon_url: null,
  description: "Full description here",
  author: { id: "a1", username: "testuser", avatar_url: null },
  repository_url: "https://github.com/test/repo",
  documentation_url: "https://docs.example.com",
  license: "MIT",
  downloads_total: 5000,
  categories: [{ id: "c1", name: "Security", slug: "security" }],
  average_rating: 4.5,
  review_count: 10,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

function renderWithSuspense(slug: string) {
  return render(
    <Suspense fallback={<div>Loading...</div>}>
      <EditPluginPage params={Promise.resolve({ slug })} />
    </Suspense>,
  );
}

describe("EditPluginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePluginMock.mockResolvedValue({ slug: "test-plugin" });
    uploadPluginIconMock.mockResolvedValue(undefined);
    deletePluginIconMock.mockResolvedValue(undefined);
    useCurrentUserMock.mockReturnValue({
      data: { id: "a1", username: "testuser", role: "author" },
      isLoading: false,
    });
    usePluginMock.mockReturnValue({
      data: mockPlugin,
      isLoading: false,
    });
  });

  it("renders 'Edit Plugin' heading", async () => {
    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    expect(
      screen.getByRole("heading", { level: 1, name: /Edit Plugin/i }),
    ).toBeInTheDocument();
  });

  it("shows PluginForm with initial data", async () => {
    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    expect(screen.getByTestId("plugin-form")).toBeInTheDocument();
    expect(screen.getByTestId("initial-data")).toHaveTextContent(
      "Test Plugin",
    );
  });

  it("shows GitHubIntegration section", async () => {
    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    expect(screen.getByTestId("github-integration")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", async () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "a1", username: "testuser", role: "author" },
      isLoading: true,
    });
    usePluginMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    let container: HTMLElement;
    await act(async () => {
      const result = renderWithSuspense("test-plugin");
      container = result.container;
    });
    expect(container!.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", async () => {
    useCurrentUserMock.mockReturnValue({
      data: null,
      isLoading: false,
    });
    usePluginMock.mockReturnValue({
      data: mockPlugin,
      isLoading: false,
    });

    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    expect(replaceMock).toHaveBeenCalledWith("/auth");
  });

  it("redirects non-owner to plugin page", async () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "other-user", username: "other", role: "author" },
      isLoading: false,
    });

    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    expect(replaceMock).toHaveBeenCalledWith("/plugins/test-plugin");
  });

  it("handleUpdate calls updatePlugin and redirects", async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderWithSuspense("test-plugin");
    });

    await user.click(screen.getByTestId("submit-form"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/plugins/test-plugin"));
    expect(updatePluginMock).toHaveBeenCalledWith(
      "test-plugin",
      expect.objectContaining({ name: "Updated" }),
    );
  });

  it("shows icon section with initials fallback when icon_url is null", async () => {
    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    expect(
      screen.getByRole("img", { name: /Test Plugin icon fallback/i }),
    ).toBeInTheDocument();
  });

  it("shows icon img when plugin has icon_url", async () => {
    usePluginMock.mockReturnValue({
      data: { ...mockPlugin, icon_url: "https://example.com/icon.png" },
      isLoading: false,
    });

    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    const img = screen.getByRole("img", { name: /Test Plugin icon/i });
    expect(img).toHaveAttribute("src", "https://example.com/icon.png");
  });

  it("shows Remove button and calls deletePluginIcon when plugin has icon_url", async () => {
    const user = userEvent.setup();
    usePluginMock.mockReturnValue({
      data: { ...mockPlugin, icon_url: "https://example.com/icon.png" },
      isLoading: false,
    });

    await act(async () => {
      renderWithSuspense("test-plugin");
    });

    const removeBtn = screen.getByRole("button", { name: /Remove current plugin icon/i });
    await user.click(removeBtn);
    await waitFor(() => expect(deletePluginIconMock).toHaveBeenCalledWith("test-plugin"));
  });

  it("handleIconChange shows error for unsupported file type", async () => {
    await act(async () => {
      renderWithSuspense("test-plugin");
    });

    const input = screen.getByTitle("Select plugin icon image") as HTMLInputElement;
    const badFile = new File(["data"], "icon.gif", { type: "image/gif" });
    Object.defineProperty(input, "files", { value: [badFile], configurable: true });
    await act(async () => { fireEvent.change(input); });

    expect(screen.getByText(/Unsupported icon type/i)).toBeInTheDocument();
  });

  it("handleIconChange shows error when file exceeds 5 MB", async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderWithSuspense("test-plugin");
    });

    const input = screen.getByTitle("Select plugin icon image");
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    await user.upload(input, bigFile);

    expect(
      screen.getByText(/Icon file is too large/i),
    ).toBeInTheDocument();
  });

  it("handleIconChange uploads valid file and revalidates", async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderWithSuspense("test-plugin");
    });

    const input = screen.getByTitle("Select plugin icon image");
    const validFile = new File(["data"], "icon.png", { type: "image/png" });
    await user.upload(input, validFile);

    await waitFor(() =>
      expect(uploadPluginIconMock).toHaveBeenCalledWith("test-plugin", validFile),
    );
  });

  it("shows plugin not found state when plugin data is null after loading", async () => {
    usePluginMock.mockReturnValue({ data: null, isLoading: false });

    await act(async () => {
      renderWithSuspense("test-plugin");
    });
    expect(screen.getByText(/Plugin not found/i)).toBeInTheDocument();
  });
});
