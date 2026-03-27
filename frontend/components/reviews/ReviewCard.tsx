"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Flag, Trash2, EyeOff, Pencil, MoreVertical } from "lucide-react";
import type { ReviewResponse } from "@/lib/types";
import { StarRating } from "./StarRating";
import { formatTimeAgo } from "@/components/ui/PluginCard";

interface ReviewCardProps {
  readonly review: ReviewResponse;
  readonly currentUserId?: string | null;
  readonly isPluginAuthor: boolean;
  readonly isStaff: boolean;
  readonly onEdit?: () => void;
  readonly onDelete: () => void;
  readonly onReport: () => void;
  readonly onToggleVisibility?: () => void;
}

export function ReviewCard({
  review,
  currentUserId,
  isPluginAuthor,
  isStaff,
  onEdit,
  onDelete,
  onReport,
  onToggleVisibility,
}: ReviewCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isOwnReview = currentUserId === review.author.id;
  const canModerate = isPluginAuthor || isStaff;
  const hasActions = isOwnReview || canModerate || currentUserId !== null;

  return (
    <div className="border border-border-default p-5 space-y-3">
      {/* Header: author + rating + date */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {review.author.avatar_url ? (
            <Image
              src={review.author.avatar_url}
              alt={review.author.username}
              width={32}
              height={32}
              className="w-8 h-8 object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-bg-surface border border-border-default flex items-center justify-center">
              <span className="font-mono text-xs text-text-dim">
                {review.author.username.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/users/${review.author.username}`}
                className="font-mono text-xs text-text-primary hover:text-accent transition-colors"
              >
                {review.author.username}
              </Link>
              <StarRating value={review.rating} readonly size="sm" />
            </div>
            <span className="font-mono text-xs text-text-muted">
              {formatTimeAgo(review.created_at)}
              {review.updated_at !== review.created_at && " (edited)"}
            </span>
          </div>
        </div>

        {/* Actions menu */}
        {hasActions && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-text-dim hover:text-text-subtle transition-colors cursor-pointer"
              aria-label="Review actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                  onKeyDown={(e) => { if (e.key === "Escape") setShowMenu(false); }}
                  role="button"
                  tabIndex={-1}
                  aria-label="Close menu"
                />
                <div className="absolute right-0 top-full mt-1 z-20 border border-border-default bg-bg-elevated min-w-[160px]">
                  {isOwnReview && onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onEdit();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-text-secondary hover:bg-bg-surface transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                  {isOwnReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-error hover:bg-bg-surface transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                  {canModerate && !isOwnReview && onToggleVisibility && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onToggleVisibility();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-text-muted hover:bg-bg-surface transition-colors cursor-pointer"
                    >
                      <EyeOff className="w-3 h-3" />
                      Hide review
                    </button>
                  )}
                  {currentUserId && !isOwnReview && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onReport();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-warning hover:bg-bg-surface transition-colors cursor-pointer"
                    >
                      <Flag className="w-3 h-3" />
                      Report
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-raleway font-bold text-sm text-text-primary">
          {review.title}
        </h4>
      )}

      {/* Body */}
      {review.body && (
        <p className="font-raleway text-sm text-text-subtle leading-relaxed">
          {review.body}
        </p>
      )}
    </div>
  );
}
