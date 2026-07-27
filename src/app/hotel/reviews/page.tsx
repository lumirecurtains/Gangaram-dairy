"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { Loader2, Star, Filter, Package } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";

interface ReviewData {
  id: string;
  orderId: string;
  userName: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: { _seconds: number } | any;
}

export default function HotelReviewsPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();
  
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadReviews = useCallback(async () => {
    if (!user || !merchantId) return;
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/hotel/reviews?merchantId=${merchantId}&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setReviews(data.reviews || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, merchantId, statusFilter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (loading) {
    return (
      <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto w-full pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Customer Reviews
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            View feedback from customers. Moderation is handled globally by Super Admins.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)] overflow-x-auto">
          <Filter className="w-4 h-4 ml-2" style={{ color: "var(--text-secondary)" }} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm outline-none font-medium cursor-pointer pr-4"
          >
            <option value="all">All Reviews</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="font-medium text-lg">No reviews found</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map(review => {
            const date = review.createdAt?._seconds ? new Date(review.createdAt._seconds * 1000) : new Date(review.createdAt);
            return (
              <div key={review.id} className="p-5 rounded-xl border bg-[var(--surface)]" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{review.userName}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    review.status === "APPROVED" ? "bg-green-100 text-green-700" :
                    review.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {review.status}
                  </span>
                </div>
                
                {review.comment && (
                  <p className="text-sm italic mb-4" style={{ color: "var(--text)" }}>"{review.comment}"</p>
                )}
                
                <div className="flex justify-between items-center text-xs pt-3 border-t border-[var(--border)]" style={{ color: "var(--text-secondary)" }}>
                  <span className="flex items-center gap-1"><Package className="w-3 h-3"/> Order #{review.orderId.slice(-8).toUpperCase()}</span>
                  <span>{date.toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
