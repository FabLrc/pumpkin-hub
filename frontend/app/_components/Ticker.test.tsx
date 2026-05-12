import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ticker } from "./Ticker";

const usePluginsMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  usePlugins: (...args: unknown[]) => usePluginsMock(...args),
}));

describe("Ticker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePluginsMock.mockReturnValue({ data: undefined });
  });

  it("renders static ticker text when no data", () => {
    render(<Ticker />);
    const matches = screen.getAllByText(/LATEST: New plugins available/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("contains text about SHA-256 verified binaries", () => {
    render(<Ticker />);
    const matches = screen.getAllByText(/SHA-256 verified binaries/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("renders dynamic plugin names when data is available", () => {
    usePluginsMock.mockReturnValue({
      data: {
        data: [
          { name: "CoolPlugin", author: { username: "dev1" } },
          { name: "AwesomePlugin", author: { username: "dev2" } },
        ],
      },
    });
    render(<Ticker />);
    const matches = screen.getAllByText(/NEW: CoolPlugin by dev1/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows uptime and rust text in dynamic mode", () => {
    usePluginsMock.mockReturnValue({
      data: {
        data: [
          { name: "P1", author: { username: "a1" } },
        ],
      },
    });
    render(<Ticker />);
    const matches = screen.getAllByText(/98.7% uptime/);
    expect(matches.length).toBeGreaterThan(0);
  });
});
