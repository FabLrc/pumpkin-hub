import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import ForgotPasswordPage from "./page";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockForgotPassword = vi.fn();

vi.mock("@/lib/api", () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Reset Password' heading", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("submit calls forgotPassword with email", async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({});
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email Address"), "test@example.com");
    await user.click(screen.getByText("Send Reset Link"));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("shows success message after submit", async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({});
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email Address"), "test@example.com");
    await user.click(screen.getByText("Send Reset Link"));

    await waitFor(() => {
      expect(screen.getByText("Check your inbox")).toBeInTheDocument();
    });
  });

  it("shows error on failure", async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockRejectedValue(new Error("Something went wrong"));
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email Address"), "test@example.com");
    await user.click(screen.getByText("Send Reset Link"));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });
});
