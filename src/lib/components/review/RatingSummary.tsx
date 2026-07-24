"use client";

import { Star } from "lucide-react";

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<number, number>;
}

export function RatingSummary({ averageRating, totalReviews, breakdown }: RatingSummaryProps) {
  if (totalReviews === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-lg font-bold">No reviews yet</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Be the first to review
        </p>
      </div>
    );
  }

  // Calculate percentages for each star level (5 down to 1)
  const levels = [5, 4, 3, 2, 1];

  return (
    <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Average rating (left side) */}
      <div className="flex flex-col items-center justify-center min-w-[120px]">
        <span className="text-5xl font-extrabold" style={{ color: "var(--text)" }}>
          {averageRating.toFixed(1)}
        </span>
        <div className="flex items-center gap-0.5 mt-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className="w-4 h-4"
              style={{
                fill: i < Math.round(averageRating) ? "var(--warning)" : "var(--border)",
                color: i < Math.round(averageRating) ? "var(--warning)" : "var(--border)",
              }}
            />
          ))}
        </div>
        <p className="text-sm mt-1 font-medium" style={{ color: "var(--text-secondary)" }}>
          {totalReviews} review{totalReviews !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Breakdown bars (right side) */}
      <div className="flex-1 space-y-2">
        {levels.map((level) => {
          const count = breakdown[level] || 0;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <div key={level} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-right font-medium" style={{ color: "var(--text-secondary)" }}>
                {level}
              </span>
              <Star className="w-3.5 h-3.5" style={{ fill: "var(--warning)", color: "var(--warning)" }} />
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    background: "var(--primary)",
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}