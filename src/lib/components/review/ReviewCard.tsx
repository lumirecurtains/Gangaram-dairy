"use client";

import { Star } from "lucide-react";

interface ReviewCardProps {
  review: {
    id: string;
    userName: string;
    rating: number;
    comment: string | null;
    createdAt: any;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "var(--primary)" }}
          >
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{review.userName}</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className="w-3.5 h-3.5"
              style={{
                fill: i < review.rating ? "var(--warning)" : "var(--border)",
                color: i < review.rating ? "var(--warning)" : "var(--border)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Review text */}
      {review.comment && (
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {review.comment}
        </p>
      )}
    </div>
  );
}