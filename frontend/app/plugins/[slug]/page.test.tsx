import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PluginPage, { generateMetadata } from "./page";

const fetchPluginMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchPlugin: (...args: unknown[]) => fetchPluginMock(...args),
}));

vi.mock("./_components/PluginPageClient", () => ({
  PluginPageClient: ({ slug }: { slug: string }) => <div>PluginPageClient:{slug}</div>,
}));

vi.mock("./_components/PluginJsonLd", () => ({
  PluginJsonLd: ({ plugin }: { plugin: { name: string } }) => <div>PluginJsonLd:{plugin.name}</div>,
}));

describe("plugins/[slug] page", () => {
  it("builds metadata from plugin payload", async () => {
    fetchPluginMock.mockResolvedValueOnce({
      name: "Demo",
      slug: "demo",
      short_description: "Short",
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "demo" }) });
    expect(metadata.title).toBe("Demo");
    expect(metadata.description).toBe("Short");
  });

  it("returns fallback metadata when plugin is missing", async () => {
    fetchPluginMock.mockRejectedValueOnce(new Error("not found"));

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "missing" }) });
    expect(metadata.title).toBe("Plugin not found");
  });

  it("renders json-ld when plugin is found", async () => {
    fetchPluginMock.mockResolvedValueOnce({
      name: "Demo",
      slug: "demo",
      short_description: null,
    });

    const element = await PluginPage({ params: Promise.resolve({ slug: "demo" }) });
    render(element);

    expect(screen.getByText("PluginJsonLd:Demo")).toBeInTheDocument();
    expect(screen.getByText("PluginPageClient:demo")).toBeInTheDocument();
  });

  it("renders client page without json-ld when fetch fails", async () => {
    fetchPluginMock.mockRejectedValueOnce(new Error("not found"));

    const element = await PluginPage({ params: Promise.resolve({ slug: "missing" }) });
    render(element);

    expect(screen.queryByText(/PluginJsonLd:/)).not.toBeInTheDocument();
    expect(screen.getByText("PluginPageClient:missing")).toBeInTheDocument();
  });
});
