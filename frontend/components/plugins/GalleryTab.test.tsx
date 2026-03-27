import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GalleryTab } from "./GalleryTab";

const useMediaMock = vi.fn();
const useCurrentUserMock = vi.fn();
const deleteMediaMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useMedia: (...args: unknown[]) => useMediaMock(...args),
  useCurrentUser: () => useCurrentUserMock(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    deleteMedia: (...args: unknown[]) => deleteMediaMock(...args),
    getMediaPath: (slug: string) => `/plugins/${slug}/media`,
  };
});

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: (...args: unknown[]) => mutateMock(...args) };
});

vi.mock("@/components/plugins/MediaUpload", () => ({
  MediaUpload: ({ pluginSlug }: { pluginSlug: string }) => <div>Upload:{pluginSlug}</div>,
}));

vi.mock("@/components/plugins/Lightbox", () => ({
  Lightbox: ({ initialIndex, onClose }: { initialIndex: number; onClose: () => void }) => (
    <div>
      <span>Lightbox:{initialIndex}</span>
      <button onClick={onClose}>Close Lightbox</button>
    </div>
  ),
}));

const plugin = {
  slug: "guard",
  author: { id: "u1", username: "alice", avatar_url: null },
} as never;

describe("GalleryTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentUserMock.mockReturnValue({ data: { id: "u1", role: "author" } });
    useMediaMock.mockReturnValue({
      isLoading: false,
      data: {
        media: [
          {
            id: "m1",
            media_type: "image",
            url: "https://cdn.example.com/1.png",
            thumbnail_url: null,
            file_name: "shot.png",
            caption: "Screenshot",
            file_size: 2048,
          },
        ],
      },
    });
    deleteMediaMock.mockResolvedValue(undefined);
  });

  it("renders loading state", () => {
    useMediaMock.mockReturnValue({ isLoading: true, data: null });
    render(<GalleryTab plugin={plugin} />);
    expect(screen.getByText("Loading gallery...")).toBeInTheDocument();
  });

  it("shows empty state and owner upload section", () => {
    useMediaMock.mockReturnValue({ isLoading: false, data: { media: [] } });
    render(<GalleryTab plugin={plugin} />);

    expect(screen.getByText("Upload:guard")).toBeInTheDocument();
    expect(screen.getByText("No media items yet")).toBeInTheDocument();
  });

  it("does not show upload section to non-owner", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "other", role: "author" } });
    useMediaMock.mockReturnValue({ isLoading: false, data: { media: [] } });

    render(<GalleryTab plugin={plugin} />);
    expect(screen.queryByText("Upload:guard")).toBeNull();
  });

  it("opens and closes lightbox when media is clicked", () => {
    render(<GalleryTab plugin={plugin} />);

    fireEvent.click(screen.getByRole("button", { name: /view shot.png/i }));
    expect(screen.getByText("Lightbox:0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Lightbox" }));
    expect(screen.queryByText("Lightbox:0")).toBeNull();
  });

  it("deletes media when confirmed", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    render(<GalleryTab plugin={plugin} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete media" }));

    await waitFor(() => {
      expect(deleteMediaMock).toHaveBeenCalledWith("guard", "m1");
      expect(mutateMock).toHaveBeenCalledWith("/plugins/guard/media");
    });
  });

  it("does not delete media when confirmation is cancelled", () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    render(<GalleryTab plugin={plugin} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete media" }));

    expect(deleteMediaMock).not.toHaveBeenCalled();
  });
});
