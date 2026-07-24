"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { showToast } from "@/lib/components/common/Toast";
import { StarRating } from "./StarRating";
import { Loader2, Send } from "lucide-react";

interface ReviewFormProps {
  orderId: string;
  merchantId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
  onSuccess?: () => void;
}

const MIN_CHARS = 10;
const MAX_CHARS = 500;

export function ReviewForm({ orderId, merchantId, existingReview, onSuccess }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [charCount, setCharCount] = useState((existingReview?.comment || "").length);
  const [isEditing, setIsEditing] = useState(!!existingReview);

  const charValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  const handleSubmit = useCallback(async () => {
    if (!user || rating === 0) return;
    if (comment.trim() && (comment.trim().length < MIN_CHARS || comment.trim().length > MAX_CHARS)) return;

    setSubmitting(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const token = await user.getIdToken();

      if (isEditing && existingReview?.id) {
        // Update existing review
        const res = await fetch(`/api/v1/reviews/${existingReview.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            rating,
            comment: comment.trim() || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update review");
        }

        showToast("Review updated! It will appear after moderation.", "success");
      } else {
        // Create new review
        const res = await fetch("/api/v1/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            orderId,
            rating,
            comment: comment.trim() || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to submit review");
        }

        showToast("Review submitted! Thank you for your feedback.", "success");
      }

      setSubmitted(true);
      setIsEditing(false);
      onSuccess?.();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [user, rating, comment, orderId, isEditing, existingReview, onSuccess]);

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "rgba(0,200,83,0.15)" }}
        >
          <Send className="w-6 h-6" style={{ color: "var(--accent)" }} />
        </div>
        <p className="font-semibold">
          {isEditing ? "Review updated!" : "Review submitted!"}
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {isEditing
            ? "Your updated review is pending moderation."
            : "Your review will appear after moderation."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold text-lg">
        {isEditing ? "Edit Your Review" : "Write a Review"}
      </h3>

      {/* Star rating */}
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
          Rating
        </p>
        <StarRating rating={rating} onChange={setRating} size="lg" />
        {rating === 0 && (
          <p className="text-xs mt-1" style={{ color: "var(--error)" }}>
            Please select a rating
          </p>
        )}
      </div>

      {/* Review text */}
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
          Your Review
        </p>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setCharCount(e.target.value.length);
          }}
          placeholder="Tell others about your experience..."
          rows={4}
          maxLength={MAX_CHARS + 50}
          className="w-full p-3 rounded-xl text-sm outline-none resize-none transition-all"
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: `1px solid ${!comment.trim() || charValid ? "var(--border)" : "var(--error)"}`,
          }}
        />
        <div className="flex items-center justify-between mt-1.5">
          {charCount < MIN_CHARS && charCount > 0 && (
            <p className="text-xs" style={{ color: "var(--warning)" }}>
              Minimum {MIN_CHARS} characters ({MIN_CHARS - charCount} more)
            </p>
          )}
          {charCount > MAX_CHARS && (
            <p className="text-xs" style={{ color: "var(--error)" }}>
              Maximum {MAX_CHARS} characters ({charCount - MAX_CHARS} over)
            </p>
          )}
          {(!comment.trim() || charValid) && <span />}
          <span
            className={`text-xs font-medium ${
              charCount > MAX_CHARS ? "text-red-500" : ""
            }`}
            style={{ color: charCount > MAX_CHARS ? "var(--error)" : "var(--text-secondary)" }}
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0 || (!!comment.trim() && !charValid)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{ background: "var(--primary)" }}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> {isEditing ? "Update Review" : "Submit Review"}
          </>
        )}
      </button>
    </div>
  );
}
