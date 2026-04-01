"use client";

import { useState } from "react";
import type { ReportReason } from "@/lib/types";
import { reportReview } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

interface ReportModalProps {
  readonly pluginSlug: string;
  readonly reviewId: string;
  readonly onClose: () => void;
  readonly onSubmitted: () => void;
}

export function ReportModal({
  pluginSlug,
  reviewId,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await reportReview(pluginSlug, reviewId, {
        reason,
        details: details.trim() || undefined,
      });
      setIsSubmitting(false);
      onSubmitted();
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : "Failed to submit report");
    }
  }

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-0 max-w-none w-full h-full border-0"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
        data-testid="report-modal-backdrop"
      />

      {/* Dialog */}
      <div className="relative bg-bg-surface border border-border-default p-6 w-full max-w-md z-10">
        <h3 id="report-modal-title" className="font-raleway text-lg font-bold text-text-primary mb-4">
          Report review
        </h3>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-xs font-mono px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason selection */}
          <fieldset className="space-y-2">
            <legend className="font-mono text-xs text-text-secondary mb-1">
              Reason
            </legend>
            {REASONS.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-accent"
                />
                <span className="font-mono text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {r.label}
                </span>
              </label>
            ))}
          </fieldset>

          {/* Details */}
          <div>
            <label
              htmlFor="report-details"
              className="block font-mono text-xs text-text-secondary mb-1"
            >
              Additional details (optional)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full bg-bg-primary border border-border-default text-text-primary font-mono text-sm px-3 py-2 resize-none focus:border-accent focus:outline-none"
              placeholder="Provide more context..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!reason || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
