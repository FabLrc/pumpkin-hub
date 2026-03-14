import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminPage from "./page";

const mockReplace = vi.fn();
const useCurrentUserMock = vi.fn();
const fetchAdminStatsMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <div>Navbar</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchAdminStats: (...args: unknown[]) => fetchAdminStatsMock(...args),
    fetchAdminPlugins: vi.fn().mockResolvedValue({ data: [], pagination: null }),
    fetchAdminUsers: vi.fn().mockResolvedValue({ data: [], pagination: null }),
    fetchAuditLogs: vi.fn().mockResolvedValue({ data: [], pagination: null }),
    deactivatePlugin: vi.fn(),
    reactivatePlugin: vi.fn(),
    deactivateUser: vi.fn(),
    reactivateUser: vi.fn(),
    changeUserRole: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const defaultAdminStats = {
  total_users: 100,
  active_plugins: 50,
  deactivated_plugins: 3,
  total_downloads: 100000,
  recent_audit_logs: [],
};

describe("admin page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCurrentUserMock.mockReturnValue({
      data: { id: "u1", username: "admin", role: "admin" },
      isLoading: false,
    });

    fetchAdminStatsMock.mockResolvedValue(defaultAdminStats);
  });

  it("renders 'Admin Panel' heading", async () => {
    render(<AdminPage />);
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("shows 4 tab buttons", () => {
    render(<AdminPage />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Plugins")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
  });

  it("overview tab shows stats cards after fetchAdminStats resolves", async () => {
    render(<AdminPage />);

    expect(await screen.findByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("Active Plugins")).toBeInTheDocument();
    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByText("Total Downloads")).toBeInTheDocument();

    // Verify the formatted values
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("100.0k")).toBeInTheDocument();
  });

  it("shows 'No recent activity' when audit logs are empty", async () => {
    render(<AdminPage />);
    expect(await screen.findByText("No recent activity")).toBeInTheDocument();
  });

  it("redirects non-admin users", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "u2", username: "author", role: "author" },
      isLoading: false,
    });

    render(<AdminPage />);
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows loading skeleton when user is loading", () => {
    useCurrentUserMock.mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<AdminPage />);
    // Should not show Admin Panel heading while loading
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
    // Navbar and Footer should still be present
    expect(screen.getByText("Navbar")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("has back to dashboard link", () => {
    render(<AdminPage />);
    const backLink = screen.getByText("Back to Dashboard");
    expect(backLink.closest("a")).toHaveAttribute("href", "/dashboard");
  });
});
