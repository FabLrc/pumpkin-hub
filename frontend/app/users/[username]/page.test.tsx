import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthorProfilePage from "./page";

const fetchAuthorProfileMock = vi.fn();
const fetchAuthorPluginsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ username: "alice" }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/components/layout", () => ({
  Navbar: () => <div>Navbar</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock("@/components/ui/PluginCard", () => ({
  PluginCard: ({ plugin }: { plugin: { name: string } }) => <div>Plugin:{plugin.name}</div>,
  formatDownloads: String,
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchAuthorProfile: (...args: unknown[]) => fetchAuthorProfileMock(...args),
    fetchAuthorPlugins: (...args: unknown[]) => fetchAuthorPluginsMock(...args),
  };
});

describe("users/[username] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchAuthorProfileMock.mockResolvedValue({
      id: "u1",
      username: "alice",
      display_name: "Alice Dev",
      avatar_url: null,
      bio: "Building Rust plugins",
      role: "author",
      plugin_count: 2,
      total_downloads: 1234,
      created_at: "2024-01-01T00:00:00Z",
    });

    fetchAuthorPluginsMock.mockResolvedValue({
      data: [
        {
          id: "p1",
          name: "Guard",
          slug: "guard",
          short_description: "Protects regions",
          license: "MIT",
          downloads_total: 10,
          average_rating: 4,
          review_count: 2,
          categories: [{ id: "c1", name: "Security", slug: "security" }],
          author: { id: "u1", username: "alice", avatar_url: null },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
      pagination: {
        page: 1,
        per_page: 12,
        total: 2,
        total_pages: 2,
      },
    });
  });

  it("renders author profile and plugin list", async () => {
    render(<AuthorProfilePage />);

    expect(await screen.findByText("Alice Dev")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("Building Rust plugins")).toBeInTheDocument();
    expect(screen.getByText("Plugin:Guard")).toBeInTheDocument();
  });

  it("renders not found state when profile fetch fails", async () => {
    fetchAuthorProfileMock.mockRejectedValueOnce(new Error("not found"));
    render(<AuthorProfilePage />);

    expect(await screen.findByText("Author Not Found")).toBeInTheDocument();
    expect(screen.getByText(/No user with username/i)).toBeInTheDocument();
  });

  it("renders empty plugins state", async () => {
    fetchAuthorPluginsMock.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, per_page: 12, total: 0, total_pages: 1 },
    });

    render(<AuthorProfilePage />);

    expect(await screen.findByText("Alice Dev")).toBeInTheDocument();
    expect(
      screen.getByText("This author hasn't published any plugins yet."),
    ).toBeInTheDocument();
  });

  it("loads next page when clicking Next", async () => {
    fetchAuthorPluginsMock
      .mockResolvedValueOnce({
        data: [
          {
            id: "p1",
            name: "Guard",
            slug: "guard",
            short_description: "Protects regions",
            license: "MIT",
            downloads_total: 10,
            average_rating: 4,
            review_count: 2,
            categories: [{ id: "c1", name: "Security", slug: "security" }],
            author: { id: "u1", username: "alice", avatar_url: null },
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        pagination: { page: 1, per_page: 12, total: 2, total_pages: 2 },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "p2",
            name: "Economy",
            slug: "economy",
            short_description: "Adds economy",
            license: "MIT",
            downloads_total: 20,
            average_rating: 5,
            review_count: 4,
            categories: [{ id: "c2", name: "Economy", slug: "economy" }],
            author: { id: "u1", username: "alice", avatar_url: null },
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        pagination: { page: 2, per_page: 12, total: 2, total_pages: 2 },
      });

    render(<AuthorProfilePage />);
    await screen.findByText("Alice Dev");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(fetchAuthorPluginsMock).toHaveBeenCalledWith("alice", 2, 12);
      expect(screen.getByText("Plugin:Economy")).toBeInTheDocument();
    });
  });
});
