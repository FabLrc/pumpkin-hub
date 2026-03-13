import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionForm } from "./VersionForm";

vi.mock("@/lib/hooks", () => ({
  usePumpkinVersions: () => ({
    data: [{ version: "1.20.1" }, { version: "1.21.0" }],
    isLoading: false,
  }),
}));

describe("VersionForm", () => {
  it("validates semver before submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<VersionForm onSubmit={onSubmit} isSubmitting={false} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("1.0.0"), "bad-semver");
    await user.click(screen.getByRole("button", { name: "Publish Version" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/valid semantic/i)).toBeInTheDocument();
  });

  it("submits valid data and allows cancel", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(<VersionForm onSubmit={onSubmit} isSubmitting={false} onCancel={onCancel} />);

    await user.type(screen.getByPlaceholderText("1.0.0"), "1.2.3");
    await user.selectOptions(screen.getByLabelText(/Pumpkin Version Min/i), "1.20.1");
    await user.selectOptions(screen.getByLabelText(/Pumpkin Version Max/i), "1.21.0");
    await user.type(screen.getByLabelText(/Changelog/i), "Added feature");

    await user.click(screen.getByRole("button", { name: "Publish Version" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        version: "1.2.3",
        pumpkinVersionMin: "1.20.1",
        pumpkinVersionMax: "1.21.0",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("extracts API error payload for display", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('{"error":"version already exists"}'));

    render(<VersionForm onSubmit={onSubmit} isSubmitting={false} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("1.0.0"), "1.2.3");
    await user.click(screen.getByRole("button", { name: "Publish Version" }));

    expect(await screen.findByText("version already exists")).toBeInTheDocument();
  });
});
