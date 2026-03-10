"use client";

import { useState } from "react";
import { StarRating } from "./StarRating";

interface ReviewFormProps {
  onSubmit: (data: { rating: number; title: string; body: string }) => Promise<void>;
  onCancel?: () => void;
  initialValues?: { rating: number; title: string; body: string };
  submitLabel?: string;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  initialValues,
  submitLabel = "Submit Review",
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialValues?.rating ?? 0);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ rating, title, body });
      if (!initialValues) {
        setRating(0);
        setTitle("");
        setBody("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border-default p-5 space-y-4">
      <h3 className="font-raleway font-bold text-sm text-text-primary uppercase tracking-wider">
        {initialValues ? "Edit Review" : "Write a Review"}
      </h3>

      {error && (
        <div className="border border-error/30 bg-error/5 px-3 py-2">
          <p className="font-mono text-xs text-error">{error}</p>
        </div>
      )}

      {/* Star rating */}
      <div className="space-y-1">
        <label className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
          Rating *
        </label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label
          htmlFor="review-title"
          className="font-mono text-[10px] text-text-dim uppercase tracking-widest"
        >
          Title
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          placeholder="Summarize your experience"
          className="w-full bg-bg-base border border-border-default px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Body */}
      <div className="space-y-1">
        <label
          htmlFor="review-body"
          className="font-mono text-[10px] text-text-dim uppercase tracking-widest"
        >
          Comment
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="Share your experience with this plugin..."
          className="w-full bg-bg-base border border-border-default px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none transition-colors resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className="font-mono text-xs bg-accent hover:bg-accent-dark text-black font-bold px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "Submitting..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="font-mono text-xs border border-border-default text-text-muted hover:text-text-primary px-4 py-2 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
