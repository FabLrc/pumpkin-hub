import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";
import VerifyEmailPage from "./page";

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

const mockVerifyEmail = vi.fn();

vi.mock("@/lib/api", () => ({
  verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("shows error when no token", () => {
    render(<VerifyEmailPage />);
    expect(screen.getByText("Invalid verification link.")).toBeInTheDocument();
  });

  it("shows 'Verifying your email...' loading state with token", () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    mockVerifyEmail.mockReturnValue(new Promise(() => {})); // never resolves
    render(<VerifyEmailPage />);
    expect(screen.getByText("Verifying your email...")).toBeInTheDocument();
  });

  it("shows success message after verification", async () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    mockVerifyEmail.mockResolvedValue({});
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("Email verified successfully")).toBeInTheDocument();
    });
  });

  it("shows error message on failed verification", async () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    mockVerifyEmail.mockRejectedValue(new Error("Token expired"));
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Invalid or expired verification link."),
      ).toBeInTheDocument();
    });
  });
});
