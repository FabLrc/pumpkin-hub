import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...rest} />
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
    await user.click(screen.getByRole("button", { name: /user menu/i }));

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Admin Panel" })).toHaveAttribute("href", "/admin");
  });

  it("toggles mobile navigation from hamburger button", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: false });

    render(<Navbar />);

    expect(screen.getByAltText("Pumpkin Hub logo")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Explorer" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(screen.getAllByRole("link", { name: "Explorer" })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(screen.getAllByRole("link", { name: "Explorer" })).toHaveLength(1);
  });

  it("closes user menu with escape and outside click", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: {
        id: "u2",
        username: "modUser",
        display_name: "Moderator",
        role: "moderator",
        avatar_url: "https://example.com/avatar.png",
      },
      isLoading: false,
    });

    render(<Navbar />);

    const menuButton = screen.getByRole("button", { name: /user menu/i });
    expect(screen.getByAltText("modUser")).toHaveAttribute("src", "https://example.com/avatar.png");

    await user.click(menuButton);
    expect(screen.getByRole("link", { name: "Admin Panel" })).toHaveAttribute("href", "/admin");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();

    await user.click(menuButton);
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    });
  });
});
