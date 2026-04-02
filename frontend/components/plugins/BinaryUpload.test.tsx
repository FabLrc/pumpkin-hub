import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BinaryUpload } from "./BinaryUpload";

const uploadBinaryMock = vi.fn();

vi.mock("@/lib/api", () => ({
  uploadBinary: (...args: unknown[]) => uploadBinaryMock(...args),
}));

describe("BinaryUpload", () => {
  it("shows binary already uploaded message when hasBinary is true", () => {
    render(
      <BinaryUpload
        slug="plugin"
        version="1.0.0"
        hasBinary={true}
        onUploaded={vi.fn()}
      />,
    );

    expect(screen.getByText(/A binary has already been uploaded/i)).toBeInTheDocument();
  });

  it("uploads selected .wasm file", async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    uploadBinaryMock.mockResolvedValue({ binary: { checksum_sha256: "abc123" } });

    render(
      <BinaryUpload
        slug="plugin"
        version="1.0.0"
        hasBinary={false}
        onUploaded={onUploaded}
      />,
    );

    const file = new File(["binary"], "plugin.wasm", { type: "application/wasm" });
    const input = screen.getByLabelText("Select .wasm binary file");
    await user.upload(input, file);

    await user.click(screen.getByRole("button", { name: "Upload Binary" }));

    expect(uploadBinaryMock).toHaveBeenCalledWith(
      "plugin",
      "1.0.0",
      expect.any(File),
      expect.any(Function),
    );
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it("shows error when upload fails", async () => {
    const user = userEvent.setup();
    uploadBinaryMock.mockRejectedValue(new Error("upload failed"));

    render(
      <BinaryUpload
        slug="plugin"
        version="1.0.0"
        hasBinary={false}
        onUploaded={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Select .wasm binary file"),
      new File(["binary"], "plugin.wasm", { type: "application/wasm" }),
    );
    await user.click(screen.getByRole("button", { name: "Upload Binary" }));

    expect(await screen.findByText("upload failed")).toBeInTheDocument();
  });

  it("rejects zero-byte files", async () => {
    const user = userEvent.setup();

    render(
      <BinaryUpload
        slug="plugin"
        version="1.0.0"
        hasBinary={false}
        onUploaded={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Select .wasm binary file"),
      new File([], "empty.wasm", { type: "application/wasm" }),
    );

    expect(screen.getByText(/must not be empty/i)).toBeInTheDocument();
  });
});
