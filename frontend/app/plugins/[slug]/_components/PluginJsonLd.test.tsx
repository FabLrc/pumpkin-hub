import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PluginJsonLd } from "./PluginJsonLd";
import type { PluginResponse } from "@/lib/types";

const mockPlugin: PluginResponse = {
  id: "p1",
  name: "Test Plugin",
  slug: "test-plugin",
  short_description: "A test",
  description: null,
  author: { id: "a1", username: "testuser", avatar_url: null },
  repository_url: "https://github.com/test/repo",
  documentation_url: null,
  license: "MIT",
  downloads_total: 1000,
  categories: [{ id: "c1", name: "Security", slug: "security" }],
  average_rating: 4.5,
  review_count: 10,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script!.textContent!);
}

describe("PluginJsonLd", () => {
  it("renders script tag with type application/ld+json", () => {
    const { container } = render(<PluginJsonLd plugin={mockPlugin} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
  });

  it("JSON contains plugin name, slug, author", () => {
    const { container } = render(<PluginJsonLd plugin={mockPlugin} />);
    const data = getJsonLd(container);
    expect(data.name).toBe("Test Plugin");
    expect(data.url).toContain("test-plugin");
    expect(data.author.name).toBe("testuser");
  });

  it("JSON contains download count", () => {
    const { container } = render(<PluginJsonLd plugin={mockPlugin} />);
    const data = getJsonLd(container);
    expect(data.interactionStatistic.userInteractionCount).toBe(1000);
  });

  it("JSON includes license when present", () => {
    const { container } = render(<PluginJsonLd plugin={mockPlugin} />);
    const data = getJsonLd(container);
    expect(data.license).toBe("MIT");
  });

  it("JSON excludes license when not present", () => {
    const pluginNoLicense = { ...mockPlugin, license: null };
    const { container } = render(<PluginJsonLd plugin={pluginNoLicense} />);
    const data = getJsonLd(container);
    expect(data.license).toBeUndefined();
  });

  it("JSON includes repository URL when present", () => {
    const { container } = render(<PluginJsonLd plugin={mockPlugin} />);
    const data = getJsonLd(container);
    expect(data.codeRepository).toBe("https://github.com/test/repo");
  });

  it("JSON excludes repository URL when not present", () => {
    const pluginNoRepo = { ...mockPlugin, repository_url: null };
    const { container } = render(<PluginJsonLd plugin={pluginNoRepo} />);
    const data = getJsonLd(container);
    expect(data.codeRepository).toBeUndefined();
  });
});
