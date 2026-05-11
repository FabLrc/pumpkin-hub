import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renders nothing for single page", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders page numbers and nav buttons", () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("Page 3 of 5")).toBeInTheDocument();
    expect(screen.getByText("←")).toBeInTheDocument();
    expect(screen.getByText("→")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("disables prev on first page and next on last page", () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("←")).toBeDisabled();
    expect(screen.getByText("→")).not.toBeDisabled();

    rerender(
      <Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("→")).toBeDisabled();
  });

  it("calls onPageChange with correct page number", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByText("→"));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByText("←"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("shows ellipsis for many pages", () => {
    render(
      <Pagination currentPage={10} totalPages={30} onPageChange={vi.fn()} />,
    );
    const ellipses = screen.getAllByText("···");
    expect(ellipses).toHaveLength(2);
  });
});
