import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "./error";

describe("ErrorPage", () => {
  it("renders 500 heading and message", () => {
    const error = new Error("boom");
    render(<ErrorPage error={error} reset={vi.fn()} />);
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
  });

  it("shows error digest when present", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<ErrorPage error={error} reset={vi.fn()} />);
    expect(screen.getByText(/Error ID: abc123/)).toBeInTheDocument();
  });

  it("does not show error digest when absent", () => {
    const error = new Error("boom");
    render(<ErrorPage error={error} reset={vi.fn()} />);
    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("calls reset when Try Again clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);
    await user.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
