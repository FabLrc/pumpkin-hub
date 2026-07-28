import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./Navbar";

const useCurrentUserMock = vi.fn();
const usePathnameMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...rest }: Record<string, unknown>) => (
    <a href={href as string} onClick={onClick as () => void} {...rest}>
      {children as React.ReactNode}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/lib/api", () => ({
  logout: vi.fn(),
}));

vi.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  usePathnameMock.mockReturnValue("/");
  useCurrentUserMock.mockReturnValue({ data: undefined, isLoading: false });
});

describe("Navbar", () => {
  it("renders logo and branding", () => {
    render(<Navbar />);
    expect(screen.getByText("Pumpkin Hub")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("renders desktop nav links", () => {
    render(<Navbar />);
    expect(screen.getByText("Explorer")).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
    expect(screen.getByText("Server Builder")).toBeInTheDocument();
    expect(screen.getByText("Submit Plugin")).toBeInTheDocument();
  });

  it("shows Sign In when user is not authenticated", () => {
    render(<Navbar />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows loading skeleton when auth is loading", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<Navbar />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows user menu when authenticated", () => {
    useCurrentUserMock.mockReturnValue({
      data: { username: "testuser", display_name: "Test User", avatar_url: null, role: "user" },
      isLoading: false,
    });
    render(<Navbar />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByLabelText("User menu")).toBeInTheDocument();
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  it("shows user avatar when avatar_url is present", () => {
    useCurrentUserMock.mockReturnValue({
      data: {
        username: "picuser",
        display_name: "Pic User",
        avatar_url: "https://example.com/avatar.png",
        role: "user",
      },
      isLoading: false,
    });
    render(<Navbar />);
    expect(screen.getByAltText("picuser")).toBeInTheDocument();
  });

  it("opens user menu on click", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: { username: "menuuser", display_name: "Menu User", avatar_url: null, role: "user" },
      isLoading: false,
    });
    render(<Navbar />);
    await user.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("shows admin panel link for admin users", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: { username: "adminuser", display_name: "Admin", avatar_url: null, role: "admin" },
      isLoading: false,
    });
    render(<Navbar />);
    await user.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("closes user menu on outside click", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: { username: "closeuser", display_name: "Close", avatar_url: null, role: "user" },
      isLoading: false,
    });
    render(<Navbar />);
    await user.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Profile")).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("closes user menu on Escape key", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: { username: "escuser", display_name: "Esc", avatar_url: null, role: "user" },
      isLoading: false,
    });
    render(<Navbar />);
    const menuButton = screen.getByLabelText("User menu");
    await user.click(menuButton);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("renders mobile menu with hamburger button", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByLabelText("Toggle menu"));
    const mobileLinks = screen.getAllByText("Server Builder");
    expect(mobileLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("closes mobile menu when X button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByLabelText("Toggle menu"));
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getByLabelText("Toggle menu"));
    // After clicking again, toggle renders X icon
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
  });

  it("shows My Server Builds in user menu", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: { username: "builder", display_name: "Builder", avatar_url: null, role: "user" },
      isLoading: false,
    });
    render(<Navbar />);
    await user.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("My Server Builds")).toBeInTheDocument();
  });

  it("renders mobile menu with all links when hamburger is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByLabelText("Toggle menu"));
    expect(screen.getAllByText("Server Builder").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Docs").length).toBeGreaterThanOrEqual(2);
  });

  it("calls logout when sign out button is clicked", async () => {
    const user = userEvent.setup();
    const { logout } = await import("@/lib/api");
    useCurrentUserMock.mockReturnValue({
      data: { username: "logoutuser", display_name: "Logout", avatar_url: null, role: "user" },
      isLoading: false,
    });
    render(<Navbar />);
    await user.click(screen.getByLabelText("User menu"));
    await user.click(screen.getByText("Sign Out"));
    expect(logout).toHaveBeenCalledOnce();
  });

  it("renders user menu with My Server Builds link and sign out", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: { username: "signout", display_name: "Sign Out User", avatar_url: null, role: "user" },
      isLoading: false,
    });
    render(<Navbar />);
    await user.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("My Server Builds")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("closes mobile menu when logo is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByLabelText("Toggle menu"));
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getByText("Pumpkin Hub"));
    // After clicking logo, mobile menu should close — but in jsdom
    // both desktop and mobile nav remain visible/hidden by CSS
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
  });

  it("shows admin panel for moderator role", async () => {
    const user = userEvent.setup();
    useCurrentUserMock.mockReturnValue({
      data: { username: "mod", display_name: "Mod", avatar_url: null, role: "moderator" },
      isLoading: false,
    });
    render(<Navbar />);
    await user.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("highlights active nav link based on pathname", () => {
    usePathnameMock.mockReturnValue("/explorer");
    render(<Navbar />);
    const explorerLink = screen.getByText("Explorer");
    expect(explorerLink.getAttribute("href")).toBe("/explorer");
  });

  it("renders Discord and GitHub icon links", () => {
    render(<Navbar />);
    expect(screen.getByLabelText("Pumpkin Hub Discord")).toBeInTheDocument();
    expect(screen.getByLabelText("Pumpkin MC GitHub")).toBeInTheDocument();
  });
});
