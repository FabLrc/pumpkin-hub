import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApiKeysPage from "./page";

const routerReplaceMock = vi.fn();
const useCurrentUserMock = vi.fn();
const useApiKeysMock = vi.fn();
const createApiKeyMock = vi.fn();
const revokeApiKeyMock = vi.fn();
const mutateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const clipboardWriteTextMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }),
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <div>Navbar</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: () => useCurrentUserMock(),
  useApiKeys: () => useApiKeysMock(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    createApiKey: (...args: unknown[]) => createApiKeyMock(...args),
    revokeApiKey: (...args: unknown[]) => revokeApiKeyMock(...args),
  };
});

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: (...args: unknown[]) => mutateMock(...args) };
});

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("dashboard api-keys page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    clipboardWriteTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWriteTextMock },
      configurable: true,
    });

    useCurrentUserMock.mockReturnValue({
      data: { id: "u1", username: "fab", email_verified: true },
      isLoading: false,
    });

    useApiKeysMock.mockReturnValue({
      data: [
        {
          id: "k1",
          name: "CI",
          key_prefix: "phub_test",
          permissions: ["publish"],
          created_at: "2026-03-01T00:00:00Z",
          expires_at: null,
          last_used_at: "2026-03-10T00:00:00Z",
        },
      ],
      isLoading: false,
    });

    createApiKeyMock.mockResolvedValue({ key: "phub_secret_123" });
    revokeApiKeyMock.mockResolvedValue(undefined);
  });

  it("redirects unauthenticated users", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: false });

    render(<ApiKeysPage />);
    expect(routerReplaceMock).toHaveBeenCalledWith("/auth");
  });

  it("creates a key, shows reveal banner and supports copy", async () => {
    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await user.click(screen.getByRole("button", { name: /New Key/i }));
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "GitHub Actions Deploy" } });
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await user.click(screen.getByRole("button", { name: "Create Key" }));

    expect(createApiKeyMock).toHaveBeenCalled();
    expect(await screen.findByText(/Save your API key now/i)).toBeInTheDocument();

    await user.click(screen.getByTitle("Copy to clipboard"));
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(/Save your API key now/i)).not.toBeInTheDocument();
  }, 15000);

  it("revokes key through confirm flow", async () => {
    const user = userEvent.setup();
    render(<ApiKeysPage />);

    await user.click(screen.getByTitle("Revoke key"));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(revokeApiKeyMock).toHaveBeenCalledWith("k1");
    expect(mutateMock).toHaveBeenCalled();
  });
});
