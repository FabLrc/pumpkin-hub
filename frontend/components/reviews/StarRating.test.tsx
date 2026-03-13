import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "./StarRating";

vi.mock("lucide-react", () => ({
  Star: ({ className }: { className?: string }) => <svg data-testid="star" className={className} />,
}));

describe("StarRating", () => {
  it("renders 5 stars and handles click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<StarRating value={3} onChange={onChange} />);

    const fourth = screen.getByRole("button", { name: "4 stars" });
    await user.click(fourth);

    expect(screen.getAllByTestId("star")).toHaveLength(5);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("disables interactions in readonly mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<StarRating value={4} onChange={onChange} readonly />);

    const third = screen.getByRole("button", { name: "3 stars" });
    expect(third).toBeDisabled();
    await user.click(third);

    expect(onChange).not.toHaveBeenCalled();
  });
});
