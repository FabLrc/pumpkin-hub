"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { MediaResponse } from "@/lib/types";

interface LightboxProps {
  media: MediaResponse[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Full-screen lightbox for browsing gallery media.
 * Supports keyboard navigation (Escape, Arrow keys) and
 * swipe-like prev/next buttons.
 */
export function Lightbox({ media, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const item = media[currentIndex];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : media.length - 1));
  }, [media.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i < media.length - 1 ? i + 1 : 0));
  }, [media.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goToPrevious, goToNext]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media lightbox"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        aria-label="Close lightbox"
      >
        <X size={24} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 font-mono text-xs text-text-muted">
        {currentIndex + 1} / {media.length}
      </div>

      {/* Previous button */}
      {media.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-bg-elevated/80 border border-border-default hover:border-accent text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Previous media"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Media content */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {item.media_type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- lightbox media from external storage
          <img
            src={item.url}
            alt={item.caption ?? item.file_name}
            className="max-w-full max-h-[85vh] object-contain select-none"
            draggable={false}
          />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh]"
          >
            <track kind="captions" />
          </video>
        )}
      </div>

      {/* Next button */}
      {media.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-bg-elevated/80 border border-border-default hover:border-accent text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Next media"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Caption */}
      {item.caption && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-xl px-4 py-2 bg-bg-elevated/90 border border-border-default font-mono text-xs text-text-muted text-center">
          {item.caption}
        </div>
      )}

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex gap-2 max-w-[80vw] overflow-x-auto px-2 py-1">
          {media.map((m, index) => (
            <button
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`flex-shrink-0 w-12 h-12 border-2 transition-colors cursor-pointer overflow-hidden ${
                index === currentIndex
                  ? "border-accent"
                  : "border-border-default hover:border-border-hover opacity-60"
              }`}
              aria-label={`View media ${index + 1}`}
            >
              {m.media_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail strip from external storage
                <img
                  src={m.thumbnail_url ?? m.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-bg-surface flex items-center justify-center">
                  <Maximize2 size={12} className="text-text-dim" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
