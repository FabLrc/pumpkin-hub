"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  readonly value: number;
  readonly onChange?: (rating: number) => void;
  readonly readonly?: boolean;
  readonly size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      role="radiogroup"
      aria-label="Star rating"
      tabIndex={readonly ? -1 : 0}
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => !readonly && setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayValue;

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={`${readonly ? "cursor-default" : "cursor-pointer"} transition-colors`}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onClick={() => onChange?.(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              className={`${sizeClass} ${
                isFilled
                  ? "text-accent fill-accent"
                  : "text-text-dim"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
