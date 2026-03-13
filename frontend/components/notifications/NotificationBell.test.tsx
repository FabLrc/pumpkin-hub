import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "./NotificationBell";

const useUnreadCountMock = vi.fn();
const useNotificationsMock = vi.fn();
const markNotificationReadMock = vi.fn();
const markAllNotificationsReadMock = vi.fn();
const mutateNotifsMock = vi.fn();
const globalMutateMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/lib/hooks", () => ({
  useUnreadCount: () => useUnreadCountMock(),
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

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return {
    ...actual,
    useSWRConfig: () => ({ mutate: globalMutateMock }),
  };
});

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useUnreadCountMock.mockReturnValue({ data: { count: 3 } });
    useNotificationsMock.mockReturnValue({
      data: {
        notifications: [
          {
            id: "n1",
            kind: "download_milestone",
            title: "100 downloads",
            body: "Great progress",
            is_read: false,
            link: "/plugins/demo",
            created_at: "2026-03-13T12:00:00Z",
          },
        ],
      },
      mutate: mutateNotifsMock,
    });

    markNotificationReadMock.mockResolvedValue(undefined);
    markAllNotificationsReadMock.mockResolvedValue(undefined);
  });

  it("shows unread badge and opens notification panel", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    expect(screen.getByLabelText(/Notifications \(3 unread\)/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Notifications/i));
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("100 downloads")).toBeInTheDocument();
    expect(screen.getByText("Great progress")).toBeInTheDocument();
  });

  it("marks one notification as read and revalidates unread count", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByLabelText(/Notifications/i));
    await user.click(screen.getByTitle("Mark as read"));

    expect(markNotificationReadMock).toHaveBeenCalledWith("n1");
    expect(mutateNotifsMock).toHaveBeenCalled();
    expect(globalMutateMock).toHaveBeenCalledWith("/notifications/unread-count");
  });

  it("marks all notifications read", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByLabelText(/Notifications/i));
    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    expect(markAllNotificationsReadMock).toHaveBeenCalled();
    expect(mutateNotifsMock).toHaveBeenCalled();
  });

  it("renders empty state when there are no notifications", async () => {
    const user = userEvent.setup();
    useUnreadCountMock.mockReturnValue({ data: { count: 0 } });
    useNotificationsMock.mockReturnValue({ data: { notifications: [] }, mutate: mutateNotifsMock });

    render(<NotificationBell />);

    await user.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
  });

  it("closes the panel on outside click", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByLabelText(/Notifications/i));
    expect(screen.getByText("Notifications")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });
});
