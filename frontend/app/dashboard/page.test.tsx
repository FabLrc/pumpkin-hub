import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

const mockReplace = vi.fn();
const mockPush = vi.fn();
const useCurrentUserMock = vi.fn();
const useAuthorPluginsMock = vi.fn();
const useAuthorDashboardStatsMock = vi.fn();
const useUnreadCountMock = vi.fn();
const resendVerificationMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <div>Navbar</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock("@/components/ui/DownloadChart", () => ({
  DownloadChart: () => <div data-testid="download-chart">DownloadChart</div>,
  GranularitySelector: ({ value }: { value: string }) => (
    <div data-testid="granularity-selector">{value}</div>
  ),
}));

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: () => useCurrentUserMock(),
  useAuthorPlugins: () => useAuthorPluginsMock(),
  useAuthorDashboardStats: () => useAuthorDashboardStatsMock(),
  useUnreadCount: () => useUnreadCountMock(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    resendVerification: (...args: unknown[]) => resendVerificationMock(...args),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const defaultUser = {
  id: "u1",
  username: "testuser",
  email: "test@test.com",
  email_verified: true,
  role: "author",
  created_at: "2024-01-01T00:00:00Z",
};

const defaultPlugins = {
  data: [
    {
      id: "p1",
      name: "My Plugin",
      slug: "my-plugin",
      downloads_total: 1000,
      created_at: "2024-01-01T00:00:00Z",
      categories: [{ slug: "security" }],
    },
  ],
};

const defaultStats = {
  total_plugins: 1,
  total_downloads: 5000,
  downloads_last_30_days: 500,
  downloads_last_7_days: 120,
  downloads_trend_percent: 15.5,
  most_downloaded_plugin: {
    slug: "my-plugin",
    name: "My Plugin",
    downloads_total: 5000,
  },
  recent_downloads: [],
};

describe("dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCurrentUserMock.mockReturnValue({
      data: defaultUser,
      isLoading: false,
    });
    useAuthorPluginsMock.mockReturnValue({
      data: defaultPlugins,
      isLoading: false,
    });
    useAuthorDashboardStatsMock.mockReturnValue({
      data: defaultStats,
      isLoading: false,
    });
    useUnreadCountMock.mockReturnValue({
      data: { count: 3 },
    });
  });

  it("renders 'Creator Dashboard' heading", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Creator Dashboard")).toBeInTheDocument();
  });

  it("shows KPI cards with correct labels", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Published Plugins")).toBeInTheDocument();
    expect(screen.getByText("Total Downloads")).toBeInTheDocument();
    expect(screen.getByText("Last 30 Days")).toBeInTheDocument();
    expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
  });

  it("shows KPI card values from stats", () => {
    render(<DashboardPage />);
    // total_plugins = 1
    expect(screen.getByText("1")).toBeInTheDocument();
    // total_downloads = 5000 → "5k"
    expect(screen.getByText("5k")).toBeInTheDocument();
    // downloads_last_30_days = 500
    expect(screen.getByText("500")).toBeInTheDocument();
    // downloads_last_7_days = 120
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("shows trend percentage for last 30 days", () => {
    render(<DashboardPage />);
    expect(screen.getByText("+15.5%")).toBeInTheDocument();
  });

  it("shows most downloaded plugin highlight", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Top Performer")).toBeInTheDocument();
    // The plugin name appears in the highlight and also in the table
    const pluginLinks = screen.getAllByText("My Plugin");
    expect(pluginLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("5k downloads")).toBeInTheDocument();
  });

  it("shows 'Your Plugins' table with plugin row", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Your Plugins")).toBeInTheDocument();
    expect(screen.getByText("1 plugin")).toBeInTheDocument();
  });

  it("plugin row shows name and download count", () => {
    render(<DashboardPage />);
    // Plugin name link
    const pluginLinks = screen.getAllByText("My Plugin");
    expect(pluginLinks.length).toBeGreaterThanOrEqual(1);
    // downloads_total = 1000 → "1k" in the row
    expect(screen.getByText("1k")).toBeInTheDocument();
    expect(screen.getByText("downloads")).toBeInTheDocument();
  });

  it("plugin row has edit and view links", () => {
    render(<DashboardPage />);
    const editLink = screen.getByTitle("Edit plugin");
    expect(editLink).toHaveAttribute("href", "/plugins/my-plugin/edit");
    const viewLink = screen.getByTitle("View plugin");
    expect(viewLink).toHaveAttribute("href", "/plugins/my-plugin");
  });

  it("shows 'No plugins yet' when plugins list is empty", () => {
    useAuthorPluginsMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    useAuthorDashboardStatsMock.mockReturnValue({
      data: { ...defaultStats, total_plugins: 0, most_downloaded_plugin: null },
      isLoading: false,
    });

    render(<DashboardPage />);
    expect(screen.getByText("No plugins yet")).toBeInTheDocument();
  });

  it("redirects to /auth when not authenticated", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: false });

    render(<DashboardPage />);
    expect(mockReplace).toHaveBeenCalledWith("/auth");
  });

  it("shows email verification banner when email is not verified", () => {
    useCurrentUserMock.mockReturnValue({
      data: { ...defaultUser, email_verified: false },
      isLoading: false,
    });

    render(<DashboardPage />);
    expect(
      screen.getByText(/Your email is not verified/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Resend verification email"),
    ).toBeInTheDocument();
  });

  it("does not show email verification banner when email is verified", () => {
    render(<DashboardPage />);
    expect(
      screen.queryByText(/Your email is not verified/),
    ).not.toBeInTheDocument();
  });

  it("renders API Keys quick link", () => {
    render(<DashboardPage />);
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    const apiKeysLink = screen.getByText("API Keys").closest("a");
    expect(apiKeysLink).toHaveAttribute("href", "/dashboard/api-keys");
  });

  it("renders Notifications quick link with unread count", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    const notifLink = screen.getByText("Notifications").closest("a");
    expect(notifLink).toHaveAttribute("href", "/dashboard/notifications");
    // unread count badge showing 3
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
