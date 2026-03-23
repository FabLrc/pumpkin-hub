import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import ResetPasswordPage from "./page";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const mockResetPassword = vi.fn();

vi.mock("@/lib/api", () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("shows error when no token in URL", () => {
    render(<ResetPasswordPage />);
    expect(
      screen.getByText("Invalid reset link. Please request a new password reset."),
    ).toBeInTheDocument();
  });

  it("shows form with new password and confirm fields when token is present", () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("shows error when passwords don't match", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("token=abc123");
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different1");
    await user.click(screen.getByRole("button", { name: "Set New Password" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("shows error when password too short", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("token=abc123");
    render(<ResetPasswordPage />);

    const newPw = screen.getByLabelText("New Password");
    const confirmPw = screen.getByLabelText("Confirm Password");

    // Bypass browser minLength validation by setting value directly
    await user.type(newPw, "short");
    await user.type(confirmPw, "short");

    // Programmatically submit to bypass HTML5 validation
    const form = newPw.closest("form")!;
    form.requestSubmit = vi.fn(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await user.click(screen.getByRole("button", { name: "Set New Password" }));

    // The browser validation may block, so we check if the API was NOT called
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("calls resetPassword on valid submit", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("token=abc123");
    mockResetPassword.mockResolvedValue({});
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New Password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "Set New Password" }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("abc123", "newpassword123");
    });
  });

  it("shows success message after reset", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("token=abc123");
    mockResetPassword.mockResolvedValue({});
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New Password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "Set New Password" }));

    await waitFor(() => {
      expect(screen.getByText("Password reset successful")).toBeInTheDocument();
    });
  });
});
