import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PluginActions } from "./PluginActions";
import type { PluginResponse } from "@/lib/types";

const pushMock = vi.fn();
const useCurrentUserMock = vi.fn();
const deletePluginMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/hooks", () => ({ useCurrentUser: () => useCurrentUserMock() }));
vi.mock("@/lib/api", () => ({
  deletePlugin: (...args: unknown[]) => deletePluginMock(...args),
  getPluginsPath: () => "/plugins",
}));
vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: vi.fn() };
});

const basePlugin = {
  id: "p1",
  name: "My Plugin",
  slug: "my-plugin",
  author: { id: "author-1", username: "bob", avatar_url: null, email: "b@b.com", role: "user", is_active: true, created_at: "" },
} as unknown as PluginResponse;

describe("PluginActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when user is not the author", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "other", role: "user" } });
    const { container } = render(<PluginActions plugin={basePlugin} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when user is not logged in", () => {
    useCurrentUserMock.mockReturnValue({ data: null });
    const { container } = render(<PluginActions plugin={basePlugin} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Edit and Delete buttons for plugin author", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "author-1", role: "user" } });
    render(<PluginActions plugin={basePlugin} />);
    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute(
      "href",
      "/plugins/my-plugin/edit",
    );
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("renders actions for admin user even if not the author", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "admin-1", role: "admin" } });
    render(<PluginActions plugin={basePlugin} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("opens confirm modal when Delete is clicked", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "author-1", role: "user" } });
    render(<PluginActions plugin={basePlugin} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText("This action cannot be undone")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
  });

  it("cancels deletion when Cancel is clicked in confirm modal", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "author-1", role: "user" } });
    render(<PluginActions plugin={basePlugin} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Delete Plugin")).toBeNull();
  });

  it("calls deletePlugin and navigates on confirm", async () => {
    deletePluginMock.mockResolvedValueOnce(undefined);
    useCurrentUserMock.mockReturnValue({ data: { id: "author-1", role: "user" } });
    render(<PluginActions plugin={basePlugin} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete plugin/i }));
    await waitFor(() => {
      expect(deletePluginMock).toHaveBeenCalledWith("my-plugin");
      expect(pushMock).toHaveBeenCalledWith("/explorer");
    });
  });
});
