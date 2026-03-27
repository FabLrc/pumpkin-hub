"use client";

import { useState } from "react";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";

interface ReviewFormProps {
  readonly onSubmit: (data: { rating: number; title: string; body: string }) => Promise<void>;
  readonly onCancel?: () => void;
  readonly initialValues?: { rating: number; title: string; body: string };
  readonly submitLabel?: string;
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
      <fieldset className="space-y-1 border-0 p-0 m-0">
        <legend className="font-mono text-xs text-text-muted uppercase tracking-widest">
          Rating *
        </legend>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </fieldset>

      {/* Title */}
      <div className="space-y-1">
        <label
          htmlFor="review-title"
          className="font-mono text-xs text-text-muted uppercase tracking-widest"
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
          className="font-mono text-xs text-text-muted uppercase tracking-widest"
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
        <Button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
