import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewCard } from "./ReviewCard";
import type { ReviewResponse } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("@/components/ui/PluginCard", () => ({
  formatTimeAgo: () => "2 days ago",
}));

const baseReview: ReviewResponse = {
  id: "rev-1",
  plugin_id: "plugin-1",
  author: {
    id: "user-1",
    username: "alice",
    avatar_url: null,
  },
  rating: 4,
  title: "Great plugin",
  body: "Works really well!",
  is_hidden: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("ReviewCard", () => {
  it("renders review content without actions for anonymous user", () => {
    render(
      <ReviewCard
        review={baseReview}
        currentUserId={null}
        isPluginAuthor={false}
        isStaff={false}
        onDelete={vi.fn()}
        onReport={vi.fn()}
      />,
    );
    expect(screen.getByText("Great plugin")).toBeInTheDocument();
    expect(screen.getByText("Works really well!")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    // No actions button for anon user (hasActions = false)
    expect(screen.queryByLabelText("Review actions")).toBeNull();
  });

  it("shows action menu for own review with edit and delete", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        currentUserId="user-1"
        isPluginAuthor={false}
        isStaff={false}
        onEdit={onEdit}
        onDelete={onDelete}
        onReport={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Review actions"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    // No report on own review
    expect(screen.queryByText("Report")).toBeNull();
  });

  it("calls onEdit when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        currentUserId="user-1"
        isPluginAuthor={false}
        isStaff={false}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onReport={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Review actions"));
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("shows Hide review for moderator on other user review", () => {
    const onToggleVisibility = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        currentUserId="mod-1"
        isPluginAuthor={false}
        isStaff={true}
        onDelete={vi.fn()}
        onReport={vi.fn()}
        onToggleVisibility={onToggleVisibility}
      />,
    );
    fireEvent.click(screen.getByLabelText("Review actions"));
    fireEvent.click(screen.getByText("Hide review"));
    expect(onToggleVisibility).toHaveBeenCalledOnce();
  });

  it("shows Report button for logged-in other user", () => {
    const onReport = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        currentUserId="other-user"
        isPluginAuthor={false}
        isStaff={false}
        onDelete={vi.fn()}
        onReport={onReport}
      />,
    );
    fireEvent.click(screen.getByLabelText("Review actions"));
    fireEvent.click(screen.getByText("Report"));
    expect(onReport).toHaveBeenCalledOnce();
  });

  it("uses avatar initials when no avatar_url", () => {
    render(
      <ReviewCard
        review={baseReview}
        currentUserId={null}
        isPluginAuthor={false}
        isStaff={false}
        onDelete={vi.fn()}
        onReport={vi.fn()}
      />,
    );
    // alice → AL
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders user avatar image when avatar_url is set", () => {
    const reviewWithAvatar = {
      ...baseReview,
      author: { ...baseReview.author, avatar_url: "https://example.com/avatar.png" },
    };
    render(
      <ReviewCard
        review={reviewWithAvatar}
        currentUserId={null}
        isPluginAuthor={false}
        isStaff={false}
        onDelete={vi.fn()}
        onReport={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "alice" })).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );
  });
});
