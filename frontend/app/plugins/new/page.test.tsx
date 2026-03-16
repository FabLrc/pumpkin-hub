import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import NewPluginPage from "./page";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const useCurrentUserMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: (...args: unknown[]) => useCurrentUserMock(...args),
}));

vi.mock("@/lib/api", () => ({
  createPlugin: vi.fn(),
}));

vi.mock("@/components/plugins/PluginForm", () => ({
  PluginForm: (props: { submitLabel?: string }) => (
    <div data-testid="plugin-form" data-label={props.submitLabel}>
      PluginForm
    </div>
  ),
}));

vi.mock("@/components/plugins/PublishFromGithubForm", () => ({
  PublishFromGithubForm: () => (
    <div data-testid="github-form">PublishFromGithubForm</div>
  ),
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

describe("NewPluginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentUserMock.mockReturnValue({
      data: { id: "u1", username: "test" },
      isLoading: false,
    });
  });

  it("renders 'Publish a Plugin' heading", () => {
    render(<NewPluginPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Publish a Plugin/i }),
    ).toBeInTheDocument();
  });

  it("shows Manual and From GitHub mode tabs", () => {
    render(<NewPluginPage />);
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("From GitHub")).toBeInTheDocument();
  });

  it("Manual mode is active by default", () => {
    render(<NewPluginPage />);
    expect(screen.getByTestId("plugin-form")).toBeInTheDocument();
    expect(screen.queryByTestId("github-form")).not.toBeInTheDocument();
  });

  it("switching to GitHub mode shows PublishFromGithubForm", async () => {
    const user = userEvent.setup();
    render(<NewPluginPage />);

    await user.click(screen.getByText("From GitHub"));

    expect(screen.getByTestId("github-form")).toBeInTheDocument();
    expect(screen.queryByTestId("plugin-form")).not.toBeInTheDocument();
  });

  it("redirects to /auth when not authenticated", () => {
    useCurrentUserMock.mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(<NewPluginPage />);
    expect(replaceMock).toHaveBeenCalledWith("/auth");
  });
});
