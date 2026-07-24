"use client";

import { useEffect, useState, useCallback } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, startAfter } from "firebase/firestore";
import { RatingSummary } from "./RatingSummary";
import { ReviewCard } from "./ReviewCard";
import { Loader2 } from "lucide-react";

interface ReviewsSectionProps {
  merchantId: string;
}

export function ReviewsSection({ merchantId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute rating summary from loaded reviews
  const [allApprovedIds, setAllApprovedIds] = useState<Set<string>>(new Set());

  const fetchReviews = useCallback(async (isLoadMore = false) => {
    try {
      const db = getFirebaseFirestore();
      const pageSize = 10;
      let q = query(
        collection(db, "reviews"),
        where("merchantId", "==", merchantId),
        where("status", "==", "APPROVED"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );

      if (isLoadMore && lastDoc) {
        q = query(
          collection(db, "reviews"),
          where("merchantId", "==", merchantId),
          where("status", "==", "APPROVED"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }

      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (isLoadMore) {
        setReviews((prev) => [...prev, ...fetched]);
      } else {
        setReviews(fetched);
        setAllApprovedIds(new Set(fetched.map((r: any) => r.id)));
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === pageSize);
    } catch (err: any) {
      console.error("Failed to load reviews:", err);
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [merchantId, lastDoc, isLoadMore]);

  useEffect(() => {
    if (merchantId) {
      fetchReviews();
    }
  }, [merchantId]);

  // Compute breakdown from ALL loaded reviews
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
      : 0;

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r: any) => {
    if (r.rating >= 1 && r.rating <= 5) {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (error) {
    return null; // Silently fail for reviews — non-critical section
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Ratings & Reviews</h2>

      {/* Rating summary */}
      <RatingSummary
        averageRating={averageRating}
        totalReviews={totalReviews}
        breakdown={breakdown}
      />

      {/* Review cards */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setLoadingMore(true);
              fetchReviews(true);
            }}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "var(--surface)", color: "var(--primary)", border: "1px solid var(--border)" }}
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "Load More Reviews"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
