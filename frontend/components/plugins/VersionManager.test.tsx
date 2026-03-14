import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionManager } from "./VersionManager";
import type { VersionResponse } from "@/lib/types";

const yankVersionMock = vi.fn();

vi.mock("@/lib/api", () => ({
  yankVersion: (...args: unknown[]) => yankVersionMock(...args),
}));

const baseVersion: VersionResponse = {
  id: "v1",
  version: "1.0.0",
  changelog: null,
  pumpkin_version_min: null,
  pumpkin_version_max: null,
  downloads: 42,
  is_yanked: false,
  published_at: "2025-01-01T00:00:00Z",
};

describe("VersionManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Yank button when version is NOT yanked", () => {
    render(
      <VersionManager slug="my-plugin" version={baseVersion} onMutated={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /yank/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
  });

  it("shows Restore button when version IS yanked", () => {
    const yanked = { ...baseVersion, is_yanked: true };
    render(
      <VersionManager slug="my-plugin" version={yanked} onMutated={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /yank/i })).not.toBeInTheDocument();
  });

  it("opens confirmation dialog on click", async () => {
    const user = userEvent.setup();
    render(
      <VersionManager slug="my-plugin" version={baseVersion} onMutated={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /yank/i }));
    // Dialog heading
    expect(screen.getByRole("heading", { name: /yank version/i })).toBeInTheDocument();
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
  });

  it("shows correct dialog text for yank action", async () => {
    const user = userEvent.setup();
    render(
      <VersionManager slug="my-plugin" version={baseVersion} onMutated={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /yank/i }));
    expect(
      screen.getByText(/Yanking hides this version from new installations/),
    ).toBeInTheDocument();
  });

  it("shows correct dialog text for restore action", async () => {
    const user = userEvent.setup();
    const yanked = { ...baseVersion, is_yanked: true };
    render(
      <VersionManager slug="my-plugin" version={yanked} onMutated={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /restore/i }));
    expect(
      screen.getByText(/Restoring makes this version available for installation again/),
    ).toBeInTheDocument();
  });

  it("cancel button closes dialog", async () => {
    const user = userEvent.setup();
    render(
      <VersionManager slug="my-plugin" version={baseVersion} onMutated={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /yank/i }));
    expect(screen.getByRole("heading", { name: /yank version/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("heading", { name: /yank version/i })).not.toBeInTheDocument();
  });

  it("confirm calls yankVersion and onMutated", async () => {
    const user = userEvent.setup();
    const onMutated = vi.fn();
    yankVersionMock.mockResolvedValueOnce(undefined);

    render(
      <VersionManager slug="my-plugin" version={baseVersion} onMutated={onMutated} />,
    );
    await user.click(screen.getByRole("button", { name: /yank/i }));
    // The confirm button in the dialog says "Yank Version"
    const buttons = screen.getAllByRole("button", { name: /yank version/i });
    // The dialog confirm button (not the trigger)
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(yankVersionMock).toHaveBeenCalledWith("my-plugin", "1.0.0", {
        yanked: true,
      });
      expect(onMutated).toHaveBeenCalled();
    });
  });

  it("confirm calls yankVersion with yanked=false for restore", async () => {
    const user = userEvent.setup();
    const onMutated = vi.fn();
    yankVersionMock.mockResolvedValueOnce(undefined);
    const yanked = { ...baseVersion, is_yanked: true };

    render(
      <VersionManager slug="my-plugin" version={yanked} onMutated={onMutated} />,
    );
    await user.click(screen.getByRole("button", { name: /restore/i }));
    const buttons = screen.getAllByRole("button", { name: /restore version/i });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(yankVersionMock).toHaveBeenCalledWith("my-plugin", "1.0.0", {
        yanked: false,
      });
      expect(onMutated).toHaveBeenCalled();
    });
  });

  it("button shows Processing and is disabled during loading", async () => {
    const user = userEvent.setup();
    let resolveYank: () => void;
    yankVersionMock.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolveYank = r;
      }),
    );

    render(
      <VersionManager slug="my-plugin" version={baseVersion} onMutated={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /yank/i }));
    const buttons = screen.getAllByRole("button", { name: /yank version/i });
    await user.click(buttons[buttons.length - 1]);

    expect(screen.getByText("Processing\u2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();

    resolveYank!();
    await waitFor(() => {
      expect(screen.queryByText("Processing\u2026")).not.toBeInTheDocument();
    });
  });
});
