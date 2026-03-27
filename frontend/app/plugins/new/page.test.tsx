import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import NewPluginPage from "./page";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
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

const { createPluginMock, uploadPluginIconMock } = vi.hoisted(() => ({
  createPluginMock: vi.fn(),
  uploadPluginIconMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  createPlugin: createPluginMock,
  uploadPluginIcon: uploadPluginIconMock,
}));

vi.mock("@/components/plugins/PluginForm", () => ({
  PluginForm: (props: {
    submitLabel?: string;
    onSubmit?: (data: Record<string, unknown>) => void;
  }) => (
    <div data-testid="plugin-form" data-label={props.submitLabel}>
      {"PluginForm"}
      <button
        type="button"
        data-testid="submit-form"
        onClick={() =>
          props.onSubmit?.({
            name: "My Plugin",
            shortDescription: "",
            description: "",
            repositoryUrl: "",
            documentationUrl: "",
            license: "",
            categoryIds: [],
          })
        }
      >
        Submit
      </button>
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

  it("shows loading skeleton when user is loading", () => {
    useCurrentUserMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    const { container } = render(<NewPluginPage />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows icon section in manual mode", () => {
    render(<NewPluginPage />);
    expect(screen.getByText(/Plugin Icon/i)).toBeInTheDocument();
    expect(screen.getByTitle("Select plugin icon image")).toBeInTheDocument();
  });

  it("handleCreate calls createPlugin and redirects", async () => {
    createPluginMock.mockResolvedValue({ slug: "my-plugin" });
    const user = userEvent.setup();
    render(<NewPluginPage />);

    await user.click(screen.getByTestId("submit-form"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/plugins/my-plugin"));
    expect(createPluginMock).toHaveBeenCalled();
  });

  it("handleIconSelection shows error for unsupported file type", async () => {
    render(<NewPluginPage />);

    const input = screen.getByTitle("Select plugin icon image") as HTMLInputElement;
    const badFile = new File(["data"], "icon.gif", { type: "image/gif" });
    Object.defineProperty(input, "files", { value: [badFile], configurable: true });
    await act(async () => { fireEvent.change(input); });

    expect(screen.getByText(/Unsupported icon type/i)).toBeInTheDocument();
  });

  it("handleIconSelection shows error when file exceeds 5 MB", async () => {
    const user = userEvent.setup();
    render(<NewPluginPage />);

    const input = screen.getByTitle("Select plugin icon image");
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    await user.upload(input, bigFile);

    expect(screen.getByText(/Icon file is too large/i)).toBeInTheDocument();
  });

  it("handleIconSelection accepts valid file and shows its name", async () => {
    const user = userEvent.setup();
    render(<NewPluginPage />);

    const input = screen.getByTitle("Select plugin icon image");
    const validFile = new File(["data"], "icon.png", { type: "image/png" });
    await user.upload(input, validFile);

    expect(screen.getByText("icon.png")).toBeInTheDocument();
  });

  it("remove icon button clears selected file", async () => {
    const user = userEvent.setup();
    render(<NewPluginPage />);

    const input = screen.getByTitle("Select plugin icon image");
    const validFile = new File(["data"], "icon.png", { type: "image/png" });
    await user.upload(input, validFile);

    expect(screen.getByText("icon.png")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Remove selected icon/i }));
    expect(screen.queryByText("icon.png")).not.toBeInTheDocument();
  });

});
