import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewForm } from "./ReviewForm";

describe("ReviewForm", () => {
  it("disables submit when no rating is selected", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ReviewForm onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Submit Review" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits values and resets fields in create mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ReviewForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "5 stars" }));
    await user.type(screen.getByLabelText("Title"), "Excellent plugin");
    await user.type(screen.getByLabelText("Comment"), "Very stable and fast");
    await user.click(screen.getByRole("button", { name: "Submit Review" }));

    expect(onSubmit).toHaveBeenCalledWith({
      rating: 5,
      title: "Excellent plugin",
      body: "Very stable and fast",
    });

    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Comment")).toHaveValue("");
  });

  it("keeps values in edit mode and supports cancel", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <ReviewForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialValues={{ rating: 4, title: "Nice", body: "Works" }}
        submitLabel="Update Review"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Update Review" }));
    expect(onSubmit).toHaveBeenCalledWith({ rating: 4, title: "Nice", body: "Works" });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
