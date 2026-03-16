import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaUpload } from "./MediaUpload";

const uploadMediaMock = vi.fn();
const getMediaPathMock = vi.fn(() => "/plugins/my-plugin/media");
const swrMutateMock = vi.fn();

vi.mock("@/lib/api", () => ({
  uploadMedia: uploadMediaMock,
  getMediaPath: getMediaPathMock,
}));

vi.mock("swr", async () => {
  const actual = await vi.importActual<typeof import("swr")>("swr");
  return { ...actual, mutate: (...args: unknown[]) => swrMutateMock(...args) };
});

function createFile(
  name: string,
  size: number,
  type: string,
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function selectFile(file: File) {
  const input = document.querySelector("input[type='file']") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("MediaUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:preview-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("renders upload area initially", () => {
    render(<MediaUpload pluginSlug="my-plugin" />);
    expect(
      screen.getByText(/Drop an image or video, or click to browse/),
    ).toBeInTheDocument();
  });

  it("shows error for unsupported file type", () => {
    render(<MediaUpload pluginSlug="my-plugin" />);
    selectFile(createFile("doc.pdf", 1024, "application/pdf"));
    expect(
      screen.getByText(/Unsupported file type/),
    ).toBeInTheDocument();
  });

  it("shows error for file too large (>10MB for images)", () => {
    render(<MediaUpload pluginSlug="my-plugin" />);
    selectFile(createFile("huge.png", 11 * 1024 * 1024, "image/png"));
    expect(screen.getByText(/File too large/)).toBeInTheDocument();
  });

  it("selecting valid image shows preview and file info", () => {
    render(<MediaUpload pluginSlug="my-plugin" />);
    selectFile(createFile("screenshot.png", 500_000, "image/png"));
    expect(screen.getByRole("img", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByText(/screenshot\.png/)).toBeInTheDocument();
  });

  it("caption input appears after file selection", () => {
    render(<MediaUpload pluginSlug="my-plugin" />);
    expect(screen.queryByPlaceholderText(/caption/i)).not.toBeInTheDocument();

    selectFile(createFile("shot.png", 1024, "image/png"));
    expect(screen.getByPlaceholderText(/caption/i)).toBeInTheDocument();
  });

  it("clear button removes selection", async () => {
    const user = userEvent.setup();
    render(<MediaUpload pluginSlug="my-plugin" />);

    selectFile(createFile("shot.png", 1024, "image/png"));
    expect(screen.getByRole("img", { name: "Preview" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove file/i }));

    expect(screen.queryByRole("img", { name: "Preview" })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Drop an image or video, or click to browse/),
    ).toBeInTheDocument();
  });

  it("upload button calls uploadMedia", async () => {
    const user = userEvent.setup();
    uploadMediaMock.mockResolvedValueOnce(undefined);
    render(<MediaUpload pluginSlug="my-plugin" />);

    selectFile(createFile("shot.png", 1024, "image/png"));

    await user.type(screen.getByPlaceholderText(/caption/i), "My caption");
    await user.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => {
      expect(uploadMediaMock).toHaveBeenCalledWith(
        "my-plugin",
        expect.any(File),
        "My caption",
        expect.any(Function),
      );
    });
  });

  it("shows progress text during upload", async () => {
    const user = userEvent.setup();
    let resolveUpload: () => void;
    uploadMediaMock.mockImplementation(
      (_slug: string, _file: File, _caption: string | undefined, onProgress: (n: number) => void) => {
        onProgress(50);
        return new Promise<void>((r) => {
          resolveUpload = r;
        });
      },
    );

    render(<MediaUpload pluginSlug="my-plugin" />);

    selectFile(createFile("shot.png", 1024, "image/png"));
    await user.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByText(/Uploading 50%/)).toBeInTheDocument();
    });

    resolveUpload!();
    await waitFor(() => {
      expect(screen.queryByText(/Uploading/)).not.toBeInTheDocument();
    });
  });
});
