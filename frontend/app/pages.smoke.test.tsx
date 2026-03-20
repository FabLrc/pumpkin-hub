import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const routerReplaceMock = vi.fn();
const routerPushMock = vi.fn();
const searchParamsGetMock = vi.fn();

const usePluginsMock = vi.fn();
const useCurrentUserMock = vi.fn();
const useAuthorPluginsMock = vi.fn();
const useAuthorDashboardStatsMock = vi.fn();
const useUnreadCountMock = vi.fn();

const registerWithEmailMock = vi.fn();
const loginWithEmailMock = vi.fn();
const forgotPasswordMock = vi.fn();
const resetPasswordMock = vi.fn();
const verifyEmailMock = vi.fn();
const createPluginMock = vi.fn();
const resendVerificationMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: routerPushMock }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return {
    ...actual,
    mutate: vi.fn(),
  };
});

vi.mock("@/components/layout", () => ({
  Navbar: () => <div>Navbar</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock("./_components/HeroSection", () => ({ HeroSection: () => <div>HeroSection</div> }));
vi.mock("./_components/TrendingSection", () => ({ TrendingSection: () => <div>TrendingSection</div> }));
vi.mock("./_components/FeaturesSection", () => ({ FeaturesSection: () => <div>FeaturesSection</div> }));
vi.mock("./_components/CtaSection", () => ({ CtaSection: () => <div>CtaSection</div> }));
vi.mock("./_components/Ticker", () => ({ Ticker: () => <div>Ticker</div> }));
vi.mock("./explorer/_components/ExplorerContent", () => ({ ExplorerContent: () => <div>ExplorerContent</div> }));

vi.mock("@/components/plugins/PluginForm", () => ({ PluginForm: () => <div>PluginForm</div> }));
vi.mock("@/components/plugins/PublishFromGithubForm", () => ({ PublishFromGithubForm: () => <div>PublishFromGithubForm</div> }));
vi.mock("@/components/ui/DownloadChart", () => ({
  DownloadChart: () => <div>DownloadChart</div>,
  GranularitySelector: () => <div>GranularitySelector</div>,
}));

vi.mock("@/lib/hooks", () => ({
  usePlugins: (...args: unknown[]) => usePluginsMock(...args),
  useCurrentUser: () => useCurrentUserMock(),
  useAuthorPlugins: (...args: unknown[]) => useAuthorPluginsMock(...args),
  useAuthorDashboardStats: (...args: unknown[]) => useAuthorDashboardStatsMock(...args),
  useUnreadCount: () => useUnreadCountMock(),
  usePublicStats: () => ({ data: undefined }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    registerWithEmail: (...args: unknown[]) => registerWithEmailMock(...args),
    loginWithEmail: (...args: unknown[]) => loginWithEmailMock(...args),
    forgotPassword: (...args: unknown[]) => forgotPasswordMock(...args),
    resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
    verifyEmail: (...args: unknown[]) => verifyEmailMock(...args),
    createPlugin: (...args: unknown[]) => createPluginMock(...args),
    resendVerification: (...args: unknown[]) => resendVerificationMock(...args),
  };
});

import HomePage from "./page";
import ExplorerPage from "./explorer/page";
import AuthPage from "./auth/page";
import ForgotPasswordPage from "./auth/forgot-password/page";
import ResetPasswordPage from "./auth/reset-password/page";
import VerifyEmailPage from "./auth/verify-email/page";
import NewPluginPage from "./plugins/new/page";
import DashboardPage from "./dashboard/page";

describe("app page smoke tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    usePluginsMock.mockReturnValue({ data: { data: [], pagination: { total: 0 } } });
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: true });
    useAuthorPluginsMock.mockReturnValue({ data: { data: [] }, isLoading: false });
    useAuthorDashboardStatsMock.mockReturnValue({ data: undefined, isLoading: true });
    useUnreadCountMock.mockReturnValue({ data: { count: 0 } });

    registerWithEmailMock.mockResolvedValue(undefined);
    loginWithEmailMock.mockResolvedValue(undefined);
    forgotPasswordMock.mockResolvedValue(undefined);
    resetPasswordMock.mockResolvedValue(undefined);
    verifyEmailMock.mockImplementation(() => new Promise(() => {}));
    createPluginMock.mockResolvedValue({ slug: "plugin-smoke" });
    resendVerificationMock.mockResolvedValue(undefined);

    searchParamsGetMock.mockReturnValue("token-123");
  });

  it("renders landing and explorer pages", () => {
    const { unmount: unmountHome } = render(<HomePage />);
    expect(screen.getByText("HeroSection")).toBeInTheDocument();
    unmountHome();

    render(<ExplorerPage />);
    expect(screen.getByText("ExplorerContent")).toBeInTheDocument();
  });

  it("renders auth and password recovery pages", () => {
    const { unmount: unmountAuth } = render(<AuthPage />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    unmountAuth();

    const { unmount: unmountForgot } = render(<ForgotPasswordPage />);
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
    unmountForgot();

    const { unmount: unmountReset } = render(<ResetPasswordPage />);
    expect(screen.getByRole("heading", { name: "Set New Password" })).toBeInTheDocument();
    unmountReset();

    render(<VerifyEmailPage />);
    expect(screen.getByText("Email Verification")).toBeInTheDocument();
  });

  it("renders creator pages with authenticated user", () => {
    useCurrentUserMock.mockReturnValue({
      data: {
        id: "u1",
        username: "fab",
        email: "fab@example.com",
        email_verified: true,
      },
      isLoading: false,
    });
    useAuthorPluginsMock.mockReturnValue({ data: { data: [] }, isLoading: false });
    useAuthorDashboardStatsMock.mockReturnValue({
      data: {
        total_plugins: 0,
        total_downloads: 0,
        downloads_last_30_days: 0,
        downloads_last_7_days: 0,
        recent_downloads: [],
      },
      isLoading: false,
    });

    const { unmount: unmountNew } = render(<NewPluginPage />);
    expect(screen.getByText("Publish a Plugin")).toBeInTheDocument();
    unmountNew();

    render(<DashboardPage />);
    expect(screen.getByText("Creator Dashboard")).toBeInTheDocument();
  });

  it("redirects dashboard and new plugin page when unauthenticated", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: false });

    const { unmount: unmountNew } = render(<NewPluginPage />);
    expect(routerReplaceMock).toHaveBeenCalledWith("/auth");
    unmountNew();

    render(<DashboardPage />);
    expect(routerReplaceMock).toHaveBeenCalledWith("/auth");
  });
});
