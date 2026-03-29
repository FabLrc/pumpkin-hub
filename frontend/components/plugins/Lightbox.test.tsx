import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Lightbox } from "./Lightbox";

const media = [
  {
    id: "m1",
    media_type: "image",
    url: "https://cdn.example.com/1.png",
    thumbnail_url: "https://cdn.example.com/1-thumb.png",
    file_name: "shot-1.png",
    caption: "First",
  },
  {
    id: "m2",
    media_type: "video",
    url: "https://cdn.example.com/2.mp4",
    thumbnail_url: null,
    file_name: "clip-2.mp4",
    caption: "Second",
  },
];

describe("Lightbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog and first media", () => {
    render(<Lightbox media={media as never} initialIndex={0} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Media lightbox" })).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "First" })).toBeInTheDocument();
  });

  it("navigates with next/previous buttons", () => {
    render(<Lightbox media={media as never} initialIndex={0} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Next media" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous media" }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("supports keyboard navigation and escape close", () => {
    const onClose = vi.fn();
    render(<Lightbox media={media as never} initialIndex={0} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when clicking backdrop", () => {
    const onClose = vi.fn();
    render(<Lightbox media={media as never} initialIndex={0} onClose={onClose} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Close lightbox" })[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("jumps to a media item via thumbnail strip", () => {
    render(<Lightbox media={media as never} initialIndex={0} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "View media 2" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
}
);
