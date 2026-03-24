import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginIcon } from "./PluginIcon";

describe("PluginIcon", () => {
  it("renders initials fallback when no iconUrl", () => {
    render(<PluginIcon pluginName="MyPlugin" />);
    expect(screen.getByRole("img", { name: /MyPlugin icon fallback/i })).toBeInTheDocument();
    expect(screen.getByText("MY")).toBeInTheDocument();
  });

  it("renders img when iconUrl is provided", () => {
    render(<PluginIcon pluginName="MyPlugin" iconUrl="https://example.com/icon.png" />);
    const img = screen.getByRole("img", { name: "MyPlugin icon" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/icon.png");
  });

  it("does not render img when iconUrl is null", () => {
    render(<PluginIcon pluginName="MyPlugin" iconUrl={null} />);
    expect(screen.queryByRole("img", { name: "MyPlugin icon" })).not.toBeInTheDocument();
    expect(screen.getByText("MY")).toBeInTheDocument();
  });

  it("uses first 2 chars uppercased as initials", () => {
    render(<PluginIcon pluginName="awesome-plugin" />);
    expect(screen.getByText("AW")).toBeInTheDocument();
  });

  it("applies featured styles when featured is true", () => {
    const { container } = render(<PluginIcon pluginName="P" featured />);
    expect(container.firstChild).toHaveClass("bg-accent/10");
  });

  it("applies default styles when featured is false", () => {
    const { container } = render(<PluginIcon pluginName="P" featured={false} />);
    expect(container.firstChild).toHaveClass("bg-bg-surface");
  });

  it("applies custom sizeClassName", () => {
    const { container } = render(<PluginIcon pluginName="P" sizeClassName="w-20 h-20" />);
    expect(container.firstChild).toHaveClass("w-20", "h-20");
  });
});
