import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewSection } from "./ReviewSection";

const useCurrentUserMock = vi.fn();
const useReviewsMock = vi.fn();
const createReviewMock = vi.fn();
const updateReviewMock = vi.fn();
const deleteReviewMock = vi.fn();
const toggleReviewVisibilityMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("@/lib/hooks", () => ({
  useCurrentUser: () => useCurrentUserMock(),
  useReviews: (...args: unknown[]) => useReviewsMock(...args),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    createReview: (...args: unknown[]) => createReviewMock(...args),
    updateReview: (...args: unknown[]) => updateReviewMock(...args),
    deleteReview: (...args: unknown[]) => deleteReviewMock(...args),
    toggleReviewVisibility: (...args: unknown[]) => toggleReviewVisibilityMock(...args),
  };
});

vi.mock("swr", () => ({ mutate: (...args: unknown[]) => mutateMock(...args) }));

vi.mock("./RatingOverview", () => ({
  RatingOverview: () => <div>RatingOverview</div>,
}));

vi.mock("./ReviewCard", () => ({
  ReviewCard: ({ onDelete, onEdit, onToggleVisibility, onReport }: { onDelete: () => void; onEdit: () => void; onToggleVisibility: () => void; onReport: () => void }) => (
    <div>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Delete</button>
      <button onClick={onToggleVisibility}>Toggle</button>
      <button onClick={onReport}>Report</button>
    </div>
  ),
}));

vi.mock("./ReviewForm", () => ({
  ReviewForm: ({ onSubmit, submitLabel = "Submit Review", onCancel }: { onSubmit: (data: { rating: number; title: string; body: string }) => Promise<void>; submitLabel?: string; onCancel?: () => void }) => (
    <div>
      <button onClick={() => onSubmit({ rating: 5, title: "Great", body: "Works" })}>{submitLabel}</button>
      {onCancel && <button onClick={onCancel}>CancelForm</button>}
    </div>
  ),
}));

vi.mock("./ReportModal", () => ({
  ReportModal: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>CloseReportModal</button>
  ),
}));

const plugin = {
  id: "p1",
  slug: "plugin",
  name: "Plugin",
  average_rating: 4.5,
  review_count: 1,
  author: { id: "author-1" },
} as const;

const review = {
  id: "r1",
  rating: 5,
  title: "Great",
  body: "Works",
  is_hidden: false,
  author: { id: "user-2", username: "bob", avatar_url: null },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as const;

describe("ReviewSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    useCurrentUserMock.mockReturnValue({ data: null });
    useReviewsMock.mockReturnValue({ data: undefined, isLoading: true });

    render(<ReviewSection plugin={plugin as never} />);

    expect(document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when no review exists", () => {
    useCurrentUserMock.mockReturnValue({ data: { id: "user-2", role: "user" } });
    useReviewsMock.mockReturnValue({
      data: { reviews: [], rating_distribution: { star_1: 0, star_2: 0, star_3: 0, star_4: 0, star_5: 0 }, total: 0 },
      isLoading: false,
    });

    render(<ReviewSection plugin={plugin as never} />);

    expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument();
  });

  it("allows creating and moderating reviews with cache revalidation", async () => {
    const user = userEvent.setup();

    useCurrentUserMock.mockReturnValue({ data: { id: "user-3", role: "moderator" } });
    useReviewsMock.mockReturnValue({
      data: {
        reviews: [review],
        rating_distribution: { star_1: 0, star_2: 0, star_3: 0, star_4: 0, star_5: 1 },
        total: 12,
      },
      isLoading: false,
    });

    createReviewMock.mockResolvedValue(undefined);
    updateReviewMock.mockResolvedValue(undefined);
    deleteReviewMock.mockResolvedValue(undefined);
    toggleReviewVisibilityMock.mockResolvedValue(undefined);

    render(<ReviewSection plugin={plugin as never} />);

    await user.click(screen.getByRole("button", { name: "Write a review" }));
    await user.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(createReviewMock).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Update Review" }));
    expect(updateReviewMock).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteReviewMock).toHaveBeenCalledWith("plugin", "r1");

    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(toggleReviewVisibilityMock).toHaveBeenCalledWith("plugin", "r1", true);

    await user.click(screen.getByRole("button", { name: "Report" }));
    expect(screen.getByRole("button", { name: "CloseReportModal" })).toBeInTheDocument();

    expect(mutateMock).toHaveBeenCalled();
  });
});
