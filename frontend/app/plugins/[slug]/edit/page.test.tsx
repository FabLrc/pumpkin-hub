import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
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

vi.mock("@/lib/api", () => ({
  updatePlugin: vi.fn(),
  getPluginPath: vi.fn(),
}));

vi.mock("swr", () => ({
  mutate: vi.fn(),
}));

vi.mock("@/components/plugins/PluginForm", () => ({
  PluginForm: (props: { submitLabel?: string; initialData?: { name: string } }) => (
    <div data-testid="plugin-form" data-label={props.submitLabel}>
      PluginForm
      {props.initialData && (
        <span data-testid="initial-data">{props.initialData.name}</span>
      )}
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
});
