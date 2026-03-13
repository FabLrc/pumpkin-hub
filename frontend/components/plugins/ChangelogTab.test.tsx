import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChangelogTab } from "./ChangelogTab";

const useChangelogMock = vi.fn();
const useCurrentUserMock = vi.fn();
const updateChangelogMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useChangelog: (...args: unknown[]) => useChangelogMock(...args),
  useCurrentUser: () => useCurrentUserMock(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    updateChangelog: (...args: unknown[]) => updateChangelogMock(...args),
    getChangelogPath: (slug: string) => `/plugins/${slug}/changelog`,
  };
});

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: (...args: unknown[]) => mutateMock(...args) };
});

const plugin = {
  id: "p1",
  slug: "guard",
  author: { id: "u1", username: "alice", avatar_url: null },
} as never;

describe("ChangelogTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentUserMock.mockReturnValue({ data: { id: "u1", role: "author" } });
    useChangelogMock.mockReturnValue({
      data: null,
      isLoading: false,
    });
    updateChangelogMock.mockResolvedValue(undefined);
  });

  it("renders loading state", () => {
    useChangelogMock.mockReturnValue({ data: null, isLoading: true });
    render(<ChangelogTab plugin={plugin} />);
    expect(screen.getByText("Loading changelog...")).toBeInTheDocument();
  });

  it("renders empty state and owner hint", () => {
    render(<ChangelogTab plugin={plugin} />);
    expect(screen.getByText("No changelog available")).toBeInTheDocument();
    expect(screen.getByText(/Add a changelog/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add changelog/i })).toBeInTheDocument();
  });

  it("blocks save when content is empty", async () => {
    render(<ChangelogTab plugin={plugin} />);
    fireEvent.click(screen.getByRole("button", { name: /add changelog/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Changelog content cannot be empty")).toBeInTheDocument();
    expect(updateChangelogMock).not.toHaveBeenCalled();
  });

  it("saves changelog and exits edit mode", async () => {
    render(<ChangelogTab plugin={plugin} />);
    fireEvent.click(screen.getByRole("button", { name: /add changelog/i }));

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "# Changelog\n\n- Added feature" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(updateChangelogMock).toHaveBeenCalledWith("guard", {
        content: "# Changelog\n\n- Added feature",
      });
      expect(mutateMock).toHaveBeenCalledWith("/plugins/guard/changelog");
    });
  });

  it("renders formatted markdown content and source badge", () => {
    useChangelogMock.mockReturnValue({
      isLoading: false,
      data: {
        source: "github",
        content:
          "# Changelog\n\n## [1.0.0]\n\n- **Added** `guard`\n- [Docs](https://example.com)",
      },
    });

    render(<ChangelogTab plugin={plugin} />);

    expect(screen.getByText("SYNCED FROM GITHUB")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Changelog", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("shows api error when save fails", async () => {
    updateChangelogMock.mockRejectedValueOnce(new Error("Save failed"));
    render(<ChangelogTab plugin={plugin} />);

    fireEvent.click(screen.getByRole("button", { name: /add changelog/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
  });

  it("allows canceling edit mode", () => {
    render(<ChangelogTab plugin={plugin} />);

    fireEvent.click(screen.getByRole("button", { name: /add changelog/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "draft" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByRole("button", { name: /add changelog/i })).toBeInTheDocument();
  });
});
