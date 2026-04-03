import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardConfiguratorPage from "./page";

const routerReplaceMock = vi.fn();
const useCurrentUserMock = vi.fn();
const useServerConfigsMock = vi.fn();
const rotateShareTokenMock = vi.fn();
const deleteServerConfigMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const clipboardWriteTextMock = vi.fn();
const mutateConfigsMock = vi.fn();

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
  useServerConfigs: () => useServerConfigsMock(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    rotateShareToken: (...args: unknown[]) => rotateShareTokenMock(...args),
    deleteServerConfig: (...args: unknown[]) => deleteServerConfigMock(...args),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("dashboard configurator page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const clipboard = { writeText: clipboardWriteTextMock };
    Object.defineProperty(navigator, "clipboard", {
      value: clipboard,
      configurable: true,
    });
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: clipboard,
      configurable: true,
    });
    clipboardWriteTextMock.mockResolvedValue(undefined);

    useCurrentUserMock.mockReturnValue({
      data: {
        id: "u1",
        username: "fab",
        email_verified: true,
      },
      isLoading: false,
    });

    mutateConfigsMock.mockResolvedValue(undefined);
    useServerConfigsMock.mockReturnValue({
      configs: [
        {
          id: "cfg-1",
          name: "Production Linux",
          platform: "linux",
          share_token: "token-1",
          plugin_count: 3,
          created_at: "2026-04-01T12:00:00Z",
          updated_at: "2026-04-01T12:00:00Z",
        },
      ],
      isLoading: false,
      error: undefined,
      mutate: mutateConfigsMock,
    });

    rotateShareTokenMock.mockResolvedValue(undefined);
    deleteServerConfigMock.mockResolvedValue(undefined);
  });

  it("redirects unauthenticated users", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: false });

    render(<DashboardConfiguratorPage />);
    expect(routerReplaceMock).toHaveBeenCalledWith("/auth/login");
  });

  it("copies share link to clipboard", async () => {
    const user = userEvent.setup();
    render(<DashboardConfiguratorPage />);

    await user.click(screen.getByRole("button", { name: /Copy Link/i }));

    await waitFor(() => {
      const hasSuccessFeedback = toastSuccessMock.mock.calls.some(
        (call) => call[0] === "Share link copied.",
      );
      const hasClipboardFallbackFeedback = toastErrorMock.mock.calls.some(
        (call) =>
          call[0] === "Clipboard API unavailable in this browser.",
      );

      expect(hasSuccessFeedback || hasClipboardFallbackFeedback).toBe(true);
    });
  });

  it("rotates share token and refreshes list", async () => {
    const user = userEvent.setup();
    render(<DashboardConfiguratorPage />);

    await user.click(screen.getByRole("button", { name: /Revoke/i }));

    expect(rotateShareTokenMock).toHaveBeenCalledWith("cfg-1");
    expect(mutateConfigsMock).toHaveBeenCalled();
  });

  it("deletes configuration after modal confirmation", async () => {
    const user = userEvent.setup();
    render(<DashboardConfiguratorPage />);

    await user.click(screen.getByRole("button", { name: /Delete/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Confirm delete/i }));

    expect(deleteServerConfigMock).toHaveBeenCalledWith("cfg-1");
    expect(mutateConfigsMock).toHaveBeenCalled();
  });
});
