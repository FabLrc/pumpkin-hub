"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNotifications } from "@/lib/hooks";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api";
import type { NotificationItem } from "@/lib/types";

const ITEMS_PER_PAGE = 20;

const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  download_milestone: "MILESTONE",
  new_version: "VERSION",
  system: "SYSTEM",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  readonly notification: NotificationItem;
  readonly onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border-default transition-colors ${
        notification.is_read ? "bg-bg-base" : "bg-bg-surface"
      }`}
    >
      {/* Unread indicator */}
      <div className="pt-1.5 shrink-0">
        {notification.is_read ? (
          <div className="w-2 h-2" />
        ) : (
          <div className="w-2 h-2 bg-accent" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-wider">
            {NOTIFICATION_KIND_LABELS[notification.kind] ??
              notification.kind.toUpperCase()}
          </span>
          <span className="font-mono text-[10px] text-text-dim">
            {formatDate(notification.created_at)}
          </span>
        </div>
        <p className="font-mono text-sm text-text-primary">
          {notification.title}
        </p>
        {notification.body && (
          <p className="font-mono text-xs text-text-dim mt-1">
            {notification.body}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 pt-1">
        {notification.link && (
          <Link
            href={notification.link}
            className="p-1 border border-border-default hover:border-border-hover text-text-dim hover:text-text-primary transition-colors"
            title="Go to link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
        {!notification.is_read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1 border border-border-default hover:border-accent text-text-dim hover:text-accent transition-colors cursor-pointer"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filterUnread, setFilterUnread] = useState(false);
  const { data, mutate, isLoading } = useNotifications(
    page,
    ITEMS_PER_PAGE,
    filterUnread,
  );

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const unread = data?.unread ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    mutate();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    mutate();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-accent" />
          <h1 className="font-raleway font-bold text-xl text-text-primary uppercase tracking-wider">
            Notifications
          </h1>
          {unread > 0 && (
            <span className="font-mono text-[10px] font-bold bg-accent text-black px-2 py-0.5">
              {unread} unread
            </span>
          )}
        </div>
        <Link
          href="/dashboard"
          className="font-mono text-xs text-text-dim hover:text-text-primary transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 border border-border-default bg-bg-elevated px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFilterUnread(false);
              setPage(1);
            }}
            className={`font-mono text-xs px-2 py-1 transition-colors cursor-pointer ${
              filterUnread
                ? "text-text-dim hover:text-text-primary"
                : "text-text-primary bg-bg-surface border border-border-default"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setFilterUnread(true);
              setPage(1);
            }}
            className={`font-mono text-xs px-2 py-1 transition-colors cursor-pointer ${
              filterUnread
                ? "text-text-primary bg-bg-surface border border-border-default"
                : "text-text-dim hover:text-text-primary"
            }`}
          >
            Unread
          </button>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 font-mono text-xs text-accent hover:text-accent-light transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="border border-border-default bg-bg-elevated">
        {(() => {
          if (isLoading) {
            return (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={`skeleton-notif-${i}`}
                    className="px-4 py-3 border-b border-border-default last:border-b-0"
                  >
                    <div className="h-3 w-20 bg-bg-surface animate-pulse mb-2" />
                    <div className="h-4 w-3/4 bg-bg-surface animate-pulse mb-1" />
                    <div className="h-3 w-1/2 bg-bg-surface animate-pulse" />
                  </div>
                ))}
              </div>
            );
          }
          if (notifications.length === 0) {
            return (
              <div className="px-4 py-12 text-center">
                <Bell className="w-8 h-8 text-text-dim mx-auto mb-3" />
                <p className="font-mono text-sm text-text-dim">
                  {filterUnread
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
                <p className="font-mono text-xs text-text-subtle mt-1">
                  {filterUnread
                    ? "You're all caught up!"
                    : "Notifications about your plugins will appear here."}
                </p>
              </div>
            );
          }
          return notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ));
        })()}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="font-mono text-xs text-text-dim">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              title="Previous page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 border border-border-default hover:border-border-hover text-text-dim hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next page"
              title="Next page"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 border border-border-default hover:border-border-hover text-text-dim hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
