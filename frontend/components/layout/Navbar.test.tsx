import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./Navbar";

const useCurrentUserMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/lib/hooks", () => ({ useCurrentUser: () => useCurrentUserMock() }));
vi.mock("@/lib/api", () => ({ logout: () => logoutMock() }));
vi.mock("@/components/notifications/NotificationBell", () => ({ NotificationBell: () => <div>NotificationBell</div> }));

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: true });
    const { container } = render(<Navbar />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders sign-in for guests", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: false });
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/auth");
  });

  it("shows user menu and admin panel link for admins", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: {
        id: "u1",
        username: "fab",
        display_name: "Fab",
        role: "admin",
        avatar_url: null,
      },
      isLoading: false,
    });

    render(<Navbar />);

    expect(screen.getByText("NotificationBell")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /fab/i }));

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Admin Panel" })).toHaveAttribute("href", "/admin");
  });
});
