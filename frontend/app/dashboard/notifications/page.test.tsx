import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsPage from "./page";

const useNotificationsMock = vi.fn();
const markNotificationReadMock = vi.fn();
const markAllNotificationsReadMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/lib/hooks", () => ({
  useNotifications: (...args: unknown[]) => useNotificationsMock(...args),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    markNotificationRead: (...args: unknown[]) => markNotificationReadMock(...args),
    markAllNotificationsRead: (...args: unknown[]) => markAllNotificationsReadMock(...args),
  };
});

describe("dashboard notifications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useNotificationsMock.mockReturnValue({
      data: {
        notifications: [
          {
            id: "n1",
            kind: "download_milestone",
            title: "100 downloads reached",
            body: "Great momentum",
            is_read: false,
            link: "/plugins/demo",
            created_at: "2026-03-10T10:00:00Z",
          },
        ],
        total: 21,
        unread: 3,
      },
      mutate: mutateMock,
      isLoading: false,
    });

    markNotificationReadMock.mockResolvedValue(undefined);
    markAllNotificationsReadMock.mockResolvedValue(undefined);
  });

  it("renders notifications and handles read actions", async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("100 downloads reached")).toBeInTheDocument();

    await user.click(screen.getByTitle("Mark as read"));
    expect(markNotificationReadMock).toHaveBeenCalledWith("n1");
    expect(mutateMock).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Mark all as read/i }));
    expect(markAllNotificationsReadMock).toHaveBeenCalled();
  });

  it("shows empty-state message when list is empty", () => {
    useNotificationsMock.mockReturnValue({
      data: { notifications: [], total: 0, unread: 0 },
      mutate: mutateMock,
      isLoading: false,
    });

    render(<NotificationsPage />);
    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
  });

  it("shows loading skeleton while fetching", () => {
    useNotificationsMock.mockReturnValue({
      data: undefined,
      mutate: mutateMock,
      isLoading: true,
    });

    const { container } = render(<NotificationsPage />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});
