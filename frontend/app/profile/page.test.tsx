import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "./page";

const routerReplaceMock = vi.fn();
const useCurrentUserMock = vi.fn();
const updateProfileMock = vi.fn();
const uploadAvatarMock = vi.fn();
const mutateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: vi.fn() }),
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
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
    uploadAvatar: (...args: unknown[]) => uploadAvatarMock(...args),
    getAuthMePath: () => "/auth/me",
  };
});

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: (...args: unknown[]) => mutateMock(...args) };
});

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("profile page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");

    useCurrentUserMock.mockReturnValue({
      data: {
        id: "u1",
        username: "fab",
        display_name: "Fab",
        email: "fab@example.com",
        avatar_url: null,
        bio: "Rust builder",
        role: "author",
        email_verified: true,
        created_at: "2024-01-01T00:00:00Z",
      },
      isLoading: false,
    });

    updateProfileMock.mockResolvedValue(undefined);
    uploadAvatarMock.mockResolvedValue(undefined);
    mutateMock.mockResolvedValue(undefined);
  });

  it("redirects unauthenticated users", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: false });
    render(<ProfilePage />);
    expect(routerReplaceMock).toHaveBeenCalledWith("/auth");
  });

  it("shows loading skeleton", () => {
    useCurrentUserMock.mockReturnValue({ data: null, isLoading: true });
    const { container } = render(<ProfilePage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders account info and prefilled editable fields", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("@fab")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fab")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rust builder")).toBeInTheDocument();
    expect(screen.getByText("fab@example.com")).toBeInTheDocument();
  });

  it("validates max display name length", async () => {
    render(<ProfilePage />);
    const tooLong = "x".repeat(101);

    fireEvent.change(screen.getByPlaceholderText("fab"), {
      target: { value: tooLong },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/Display name must be at most 100 characters/i)).toBeInTheDocument();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it("submits profile updates successfully", async () => {
    render(<ProfilePage />);

    fireEvent.change(screen.getByPlaceholderText("fab"), {
      target: { value: "Fabien" },
    });
    fireEvent.change(screen.getByPlaceholderText("Tell us about yourself..."), {
      target: { value: "Building pumpkin tools" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        display_name: "Fabien",
        bio: "Building pumpkin tools",
      });
      expect(mutateMock).toHaveBeenCalledWith("/auth/me");
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it("shows avatar validation error for unsupported file type", async () => {
    render(<ProfilePage />);

    const input = document.getElementById("avatar-upload") as HTMLInputElement;
    const badFile = new File(["abc"], "avatar.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [badFile] } });

    expect(
      await screen.findByText("Only JPEG, PNG, WebP, and GIF images are allowed."),
    ).toBeInTheDocument();
  });

  it("uploads avatar successfully", async () => {
    render(<ProfilePage />);

    const input = document.getElementById("avatar-upload") as HTMLInputElement;
    const file = new File(["img"], "avatar.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => {
      expect(uploadAvatarMock).toHaveBeenCalled();
      expect(mutateMock).toHaveBeenCalledWith("/auth/me");
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });
});
