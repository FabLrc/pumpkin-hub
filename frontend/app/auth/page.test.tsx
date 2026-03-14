import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "./page";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockLoginWithEmail = vi.fn();
const mockRegisterWithEmail = vi.fn();

vi.mock("@/lib/api", () => ({
  getOAuthLoginUrl: (provider: string) => `https://oauth.example.com/${provider}`,
  registerWithEmail: (...args: unknown[]) => mockRegisterWithEmail(...args),
  loginWithEmail: (...args: unknown[]) => mockLoginWithEmail(...args),
  getAuthMePath: () => "/api/v1/auth/me",
}));

const mockUseCurrentUser = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("swr", () => ({
  mutate: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ data: null });
  });

  it("shows 'Sign In' heading by default", () => {
    render(<AuthPage />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows OAuth buttons (GitHub, Google, Discord)", () => {
    render(<AuthPage />);
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Continue with Discord")).toBeInTheDocument();
  });

  it("toggle to 'Create Account' mode shows username field", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.click(
      screen.getByText("Don't have an account? Create one"),
    );

    expect(
      screen.getByRole("heading", { name: "Create Account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("submit login form calls loginWithEmail", async () => {
    const user = userEvent.setup();
    mockLoginWithEmail.mockResolvedValue({});
    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByText("Sign In with Email"));

    await waitFor(() => {
      expect(mockLoginWithEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("submit register form calls registerWithEmail", async () => {
    const user = userEvent.setup();
    mockRegisterWithEmail.mockResolvedValue({});
    render(<AuthPage />);

    await user.click(
      screen.getByText("Don't have an account? Create one"),
    );

    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByText("Create Account", { selector: "button[type='submit']" }));

    await waitFor(() => {
      expect(mockRegisterWithEmail).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("shows error message on failed submit", async () => {
    const user = userEvent.setup();
    mockLoginWithEmail.mockRejectedValue(new Error("Invalid credentials"));
    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass1");
    await user.click(screen.getByText("Sign In with Email"));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("redirects when user is already authenticated", () => {
    mockUseCurrentUser.mockReturnValue({
      data: { id: "u1", username: "testuser" },
    });
    const { container } = render(<AuthPage />);
    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Forgot password?' link in login mode", () => {
    render(<AuthPage />);
    const link = screen.getByText("Forgot password?");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/auth/forgot-password");
  });
});
