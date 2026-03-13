import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BinaryList } from "./BinaryList";

const fetchBinaryDownloadMock = vi.fn();
const writeTextMock = vi.fn();
const openMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchBinaryDownload: (...args: unknown[]) => fetchBinaryDownloadMock(...args),
  };
});

describe("BinaryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    writeTextMock.mockResolvedValue(undefined);
    fetchBinaryDownloadMock.mockResolvedValue({ download_url: "https://files.example.com/bin" });
    vi.spyOn(window, "open").mockImplementation(openMock as never);
  });

  it("renders empty state when no binaries", () => {
    render(<BinaryList slug="plug" version="1.0.0" binaries={[]} />);
    expect(screen.getByText("No binaries uploaded yet.")).toBeInTheDocument();
  });

  it("renders binary card and downloads file", async () => {
    const binaries = [
      {
        id: "b1",
        platform: "linux",
        file_name: "plugin.so",
        file_size: 2048,
        checksum_sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
    ];

    render(<BinaryList slug="plug" version="1.0.0" binaries={binaries as never} />);

    expect(screen.getByText("Linux")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => {
      expect(fetchBinaryDownloadMock).toHaveBeenCalledWith("plug", "1.0.0", "linux");
      expect(openMock).toHaveBeenCalledWith(
        "https://files.example.com/bin",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });

  it("copies checksum to clipboard", async () => {
    const binaries = [
      {
        id: "b1",
        platform: "windows",
        file_name: "plugin.dll",
        file_size: 1024,
        checksum_sha256: "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      },
    ];

    render(<BinaryList slug="plug" version="1.0.0" binaries={binaries as never} />);

    fireEvent.click(screen.getByTitle("Copy SHA-256 checksum"));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      );
    });
  });
});
