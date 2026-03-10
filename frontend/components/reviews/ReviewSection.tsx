"use client";

import { useState } from "react";
import { mutate } from "swr";
import { MessageSquare } from "lucide-react";
import type { PluginResponse, ReviewResponse } from "@/lib/types";
import { useReviews, useCurrentUser } from "@/lib/hooks";
import {
  getReviewsPath,
  getPluginPath,
  createReview,
  updateReview,
  deleteReview,
  toggleReviewVisibility,
} from "@/lib/api";
import { RatingOverview } from "./RatingOverview";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { ReportModal } from "./ReportModal";
import { Button } from "@/components/ui/Button";

interface ReviewSectionProps {
  plugin: PluginResponse;
}

const PER_PAGE = 10;

export function ReviewSection({ plugin }: ReviewSectionProps) {
  const { data: user } = useCurrentUser();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useReviews(plugin.slug, page, PER_PAGE);

  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewResponse | null>(null);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);

  const isAuthor = user?.id === plugin.author.id;
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const hasUserReview = data?.reviews.some((r) => r.author.id === user?.id) ?? false;
  const canReview = !!user && !isAuthor && !hasUserReview;

  function revalidate() {
    mutate(getReviewsPath(plugin.slug, page, PER_PAGE));
    if (page !== 1) mutate(getReviewsPath(plugin.slug, 1, PER_PAGE));
    // Revalidate the plugin itself so average_rating and review_count update
    mutate(getPluginPath(plugin.slug));
  }

  async function handleCreate(formData: { rating: number; title: string; body: string }) {
    await createReview(plugin.slug, {
      rating: formData.rating,
      title: formData.title || undefined,
      body: formData.body || undefined,
    });
    setShowForm(false);
    revalidate();
  }

  async function handleUpdate(formData: { rating: number; title: string; body: string }) {
    if (!editingReview) return;
    await updateReview(plugin.slug, editingReview.id, {
      rating: formData.rating,
      title: formData.title || undefined,
      body: formData.body || undefined,
    });
    setEditingReview(null);
    revalidate();
  }

  async function handleDelete(reviewId: string) {
    await deleteReview(plugin.slug, reviewId);
    revalidate();
  }

  async function handleToggleVisibility(review: ReviewResponse) {
    await toggleReviewVisibility(plugin.slug, review.id, !review.is_hidden);
    revalidate();
  }

  if (isLoading) {
    return <ReviewsSkeleton />;
  }

  const reviews = data?.reviews ?? [];
  const distribution = data?.rating_distribution ?? {
    star_1: 0,
    star_2: 0,
    star_3: 0,
    star_4: 0,
    star_5: 0,
  };
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-8">
      {/* Rating overview */}
      <RatingOverview
        averageRating={plugin.average_rating}
        total={total}
        distribution={distribution}
      />

      {/* Write review button / form */}
      {canReview && !showForm && !editingReview && (
        <Button variant="primary" onClick={() => setShowForm(true)}>
          Write a review
        </Button>
      )}

      {showForm && (
        <ReviewForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingReview && (
        <ReviewForm
          initialValues={{
            rating: editingReview.rating,
            title: editingReview.title ?? "",
            body: editingReview.body ?? "",
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingReview(null)}
          submitLabel="Update Review"
        />
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="border border-border-default bg-bg-elevated/30 p-8 text-center">
          <MessageSquare className="w-8 h-8 text-text-dim mx-auto mb-3" />
          <p className="font-mono text-xs text-text-dim">
            No reviews yet. Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id}
              isPluginAuthor={isAuthor}
              isStaff={isStaff}
              onEdit={() => {
                setEditingReview(review);
                setShowForm(false);
              }}
              onDelete={() => handleDelete(review.id)}
              onToggleVisibility={() => handleToggleVisibility(review)}
              onReport={() => setReportingReviewId(review.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-text-dim">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Report modal */}
      {reportingReviewId && (
        <ReportModal
          pluginSlug={plugin.slug}
          reviewId={reportingReviewId}
          onClose={() => setReportingReviewId(null)}
          onSubmitted={() => setReportingReviewId(null)}
        />
      )}
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-8">
        <div className="h-20 w-24 bg-bg-surface" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-2 bg-bg-surface" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-bg-surface border border-border-default" />
      ))}
    </div>
  );
}
