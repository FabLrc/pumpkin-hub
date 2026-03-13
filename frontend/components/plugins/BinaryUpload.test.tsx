import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BinaryUpload } from "./BinaryUpload";

const uploadBinaryMock = vi.fn();

vi.mock("@/lib/api", () => ({
  uploadBinary: (...args: unknown[]) => uploadBinaryMock(...args),
}));

describe("BinaryUpload", () => {
  it("shows all uploaded state when no platform is available", () => {
    render(
      <BinaryUpload
        slug="plugin"
        version="1.0.0"
        existingPlatforms={["windows", "linux", "macos"]}
        onUploaded={vi.fn()}
      />,
    );

    expect(screen.getByText(/All supported platforms/i)).toBeInTheDocument();
  });

  it("uploads selected file and platform", async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    uploadBinaryMock.mockResolvedValue({ binary: { checksum_sha256: "abc123" } });

    render(
      <BinaryUpload
        slug="plugin"
        version="1.0.0"
        existingPlatforms={[]}
        onUploaded={onUploaded}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Linux/i }));

    const file = new File(["binary"], "plugin.so", { type: "application/octet-stream" });
    const input = screen.getByLabelText("Select binary file");
    await user.upload(input, file);

    await user.click(screen.getByRole("button", { name: "Upload Binary" }));

    expect(uploadBinaryMock).toHaveBeenCalledWith(
      "plugin",
      "1.0.0",
      expect.any(File),
      "linux",
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
        existingPlatforms={[]}
        onUploaded={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Windows/i }));
    await user.upload(
      screen.getByLabelText("Select binary file"),
      new File(["binary"], "plugin.dll", { type: "application/octet-stream" }),
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
        existingPlatforms={[]}
        onUploaded={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Select binary file"),
      new File([], "empty.so", { type: "application/octet-stream" }),
    );

    expect(screen.getByText(/must not be empty/i)).toBeInTheDocument();
  });
});
