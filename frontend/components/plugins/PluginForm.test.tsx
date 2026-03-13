import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PluginForm } from "./PluginForm";

vi.mock("@/lib/hooks", () => ({
  useCategories: () => ({
    data: [
      { id: "cat-1", name: "Security", icon: "shield", description: "desc" },
      { id: "cat-2", name: "Utility", icon: "wrench", description: "desc" },
    ],
  }),
}));

describe("PluginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits valid form data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PluginForm
        onSubmit={onSubmit}
        submitLabel="Create Plugin"
        isSubmitting={false}
      />,
    );

    await user.type(screen.getByLabelText(/Plugin Name/i), "My Plugin");
    await user.type(screen.getByLabelText(/Short Description/i), "Great plugin");
    await user.click(screen.getByRole("button", { name: "Security" }));

    await user.click(screen.getByRole("button", { name: "Create Plugin" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Plugin",
        shortDescription: "Great plugin",
        categoryIds: ["cat-1"],
      }),
    );
  });

  it("shows validation errors on invalid submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PluginForm
        onSubmit={onSubmit}
        submitLabel="Create Plugin"
        isSubmitting={false}
      />,
    );

    await user.type(screen.getByLabelText(/Plugin Name/i), "ab");
    await user.click(screen.getByRole("button", { name: "Create Plugin" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/at least/i)).toBeInTheDocument();
  });

  it("extracts API message from server error payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('{"error":"slug already exists"}'));

    render(
      <PluginForm
        onSubmit={onSubmit}
        submitLabel="Create Plugin"
        isSubmitting={false}
      />,
    );

    await user.type(screen.getByLabelText(/Plugin Name/i), "Valid Name");
    await user.click(screen.getByRole("button", { name: "Create Plugin" }));

    expect(await screen.findByText("slug already exists")).toBeInTheDocument();
  });
});
