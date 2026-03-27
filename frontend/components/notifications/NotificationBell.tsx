"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useUnreadCount, useNotifications } from "@/lib/hooks";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { useSWRConfig } from "swr";

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  download_milestone: "MILESTONE",
  new_version: "VERSION",
  system: "SYSTEM",
};

export function NotificationBell() {
  const { data: unreadData } = useUnreadCount();
  const { data: notifData, mutate: mutateNotifs } = useNotifications(1, 5);
  const { mutate } = useSWRConfig();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = unreadData?.count ?? 0;
  const notifications = notifData?.notifications ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    mutateNotifs();
    mutate("/notifications/unread-count");
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    mutateNotifs();
    mutate("/notifications/unread-count");
  }

  const unreadSuffix = unreadCount > 0 ? ` (${unreadCount} unread)` : "";
  const bellAriaLabel = `Notifications${unreadSuffix}`;

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 border border-border-default hover:border-border-hover transition-colors cursor-pointer"
        aria-label={bellAriaLabel}
      >
        <Bell className="w-4 h-4 text-text-dim" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-accent text-black font-mono text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-bg-elevated border border-border-default z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
            <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="font-mono text-xs text-accent hover:text-accent-light transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Bell className="w-5 h-5 text-text-dim mx-auto mb-2" />
                <p className="font-mono text-xs text-text-dim">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-2 px-3 py-2 border-b border-border-default last:border-b-0 transition-colors ${
                    notification.is_read
                      ? "bg-bg-elevated"
                      : "bg-bg-surface"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                        {NOTIFICATION_KIND_LABELS[notification.kind] ??
                          notification.kind.toUpperCase()}
                      </span>
                      <span className="font-mono text-[9px] text-text-dim">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-text-primary truncate">
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="font-mono text-xs text-text-muted truncate mt-0.5">
                        {notification.body}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {notification.link && (
                      <Link
                        href={notification.link}
                        onClick={() => setIsOpen(false)}
                        className="p-0.5 text-text-dim hover:text-text-primary transition-colors"
                        title="Go to link"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="p-0.5 text-text-dim hover:text-accent transition-colors cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border-default">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center px-3 py-2 font-mono text-xs text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
