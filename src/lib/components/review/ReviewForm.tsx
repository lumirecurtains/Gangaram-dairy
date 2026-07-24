"use client";

import { useState } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/contexts";
import { StarRating } from "./StarRating";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, Send } from "lucide-react";

interface ReviewFormProps {
  orderId: string;
  merchantId: string;
  onSuccess: () => void;
}

const MAX_CHARS = 500;

export function ReviewForm({ orderId, merchantId, onSuccess }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const charCount = comment.length;
  const charValid = charCount <= MAX_CHARS;

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast("Please select a rating", "error");
      return;
    }
    if (!user) {
      showToast("Please login to review", "error");
      return;
    }
    if (comment.trim() && !charValid) {
      showToast(`Review must be under ${MAX_CHARS} characters`, "error");
      return;
    }

    setSubmitting(true);
    try {
      const db = getFirebaseFirestore();
      const docRef = await addDoc(collection(db, "reviews"), {
        userId: user.uid,
        userName: user.displayName || user.phoneNumber || "Anonymous",
        merchantId,
        orderId,
        rating,
        comment: comment.trim() || "",
        createdAt: serverTimestamp(),
        status: "pending",
      });
      showToast("Review submitted! Pending approval.", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message || "Failed to submit review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold">Rate Your Experience</h3>

      {/* Star selector */}
      <div className="flex justify-center">
        <StarRating rating={rating} onChange={setRating} size="lg" />
      </div>

      {rating > 0 && (
        <p className="text-center text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {rating === 5 && "Excellent!"}
          {rating === 4 && "Great"}
          {rating === 3 && "Good"}
          {rating === 2 && "Fair"}
          {rating === 1 && "Poor"}
        </p>
      )}

      {/* Comment */}
      <div>
        <textarea
          placeholder="Share your experience (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full p-3 rounded-xl text-sm outline-none resize-none transition-all"
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: `1px solid ${!charValid ? "var(--error)" : "var(--border)"}`,
          }}
        />

        {/* Character count */}
        <div className="flex items-center justify-between mt-1.5">
          {comment.trim() && !charValid && (
            <p className="text-xs" style={{ color: "var(--error)" }}>
              Maximum {MAX_CHARS} characters ({charCount - MAX_CHARS} over)
            </p>
          )}
          {(!comment.trim() || charValid) && <span />}
          <span
            className="text-xs font-medium"
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        style={{ background: "var(--primary)" }}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Submit Review
          </>
        )}
      </button>
    </div>
  );
}