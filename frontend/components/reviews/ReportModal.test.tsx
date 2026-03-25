import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportModal } from "./ReportModal";

const reportReviewMock = vi.fn();

vi.mock("@/lib/api", () => ({
  reportReview: (...args: unknown[]) => reportReviewMock(...args),
}));

describe("ReportModal", () => {
  const defaultProps = {
    pluginSlug: "my-plugin",
    reviewId: "rev-123",
    onClose: vi.fn(),
    onSubmitted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the modal with all reason options", () => {
    render(<ReportModal {...defaultProps} />);
    expect(screen.getByText("Report review")).toBeInTheDocument();
    expect(screen.getByText("Spam")).toBeInTheDocument();
    expect(screen.getByText("Harassment")).toBeInTheDocument();
    expect(screen.getByText("Hate speech")).toBeInTheDocument();
    expect(screen.getByText("Misinformation")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("submit button is disabled when no reason is selected", () => {
    render(<ReportModal {...defaultProps} />);
    const submitButton = screen.getByRole("button", { name: "Submit report" });
    expect(submitButton).toBeDisabled();
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<ReportModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const { container } = render(<ReportModal {...defaultProps} />);
    const backdrop = container.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("submits report with selected reason and calls onSubmitted", async () => {
    reportReviewMock.mockResolvedValueOnce(undefined);
    render(<ReportModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Spam"));
    fireEvent.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => {
      expect(reportReviewMock).toHaveBeenCalledWith("my-plugin", "rev-123", {
        reason: "spam",
        details: undefined,
      });
      expect(defaultProps.onSubmitted).toHaveBeenCalledOnce();
    });
  });

  it("shows error message when reportReview fails", async () => {
    reportReviewMock.mockRejectedValueOnce(new Error("Network error"));
    render(<ReportModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Other"));
    fireEvent.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
