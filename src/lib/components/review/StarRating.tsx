"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  maxRating?: number;
}

const SIZE_MAP = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" };

export function StarRating({ rating, onChange, size = "md", maxRating = 5 }: StarRatingProps) {
  const interactive = !!onChange;

  return (
    <div className="flex items-center gap-0.5" role={interactive ? "radiogroup" : "img"} aria-label={`${rating} out of ${maxRating} stars`}>
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= rating;
        const half = !filled && starValue - 0.5 <= rating;

        return (
          <button
            key={starValue}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            onKeyDown={(e) => {
              if (!interactive) return;
              if (e.key === "ArrowRight" && starValue < maxRating) onChange?.(starValue + 1);
              if (e.key === "ArrowLeft" && starValue > 1) onChange?.(starValue - 1);
            }}
            aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
            aria-checked={interactive ? starValue === rating : undefined}
            role={interactive ? "radio" : undefined}
            tabIndex={interactive ? (starValue === Math.round(rating) ? 0 : -1) : undefined}
            className={`${interactive ? "cursor-pointer hover:scale-110 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--primary)]" : "cursor-default"} transition-transform`}
          >
            <Star
              className={`${SIZE_MAP[size]} transition-colors`}
              style={{
                fill: filled ? "var(--warning)" : half ? "rgba(255,179,0,0.5)" : "var(--border)",
                color: filled ? "var(--warning)" : half ? "rgba(255,179,0,0.5)" : "var(--border)",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}