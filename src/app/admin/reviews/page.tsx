"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Loader2, Star, CheckCircle, XCircle } from "lucide-react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, limit, getDocs, orderBy, startAfter } from "firebase/firestore";
import { showToast } from "@/lib/components/common/Toast";
import { useAuth } from "@/lib/contexts";

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  async function loadReviews(cursor: any = null) {
    try {
      const db = getFirebaseFirestore();
      let q = query(
        collection(db, "reviews"),
        where("status", "==", "PENDING"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      if (cursor) {
        q = query(collection(db, "reviews"), where("status", "==", "PENDING"), orderBy("createdAt", "desc"), startAfter(cursor), limit(20));
      }
      
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      if (cursor) {
        setReviews(prev => [...prev, ...docs]);
      } else {
        setReviews(docs);
      }
      
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  const handleAction = async (reviewId: string, action: "approve" | "reject") => {
    try {
      const reason = action === "reject" ? prompt("Enter rejection reason (spam, abuse, etc):") : null;
      if (action === "reject" && !reason) return;

      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewId, action, moderationReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReviews(reviews.filter(r => r.id !== reviewId));
      showToast(`Review ${action}d successfully`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Star className="w-6 h-6" style={{ color: "var(--primary)" }} />
          Review Moderation
        </h1>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center p-12 border rounded-xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p style={{ color: "var(--text-secondary)" }}>No pending reviews to moderate.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 font-mono">Order: {r.orderId.slice(-8)} | Merchant: {r.merchantId}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">{r.status}</span>
                </div>
                
                {r.comment && <p className="text-sm">"{r.comment}"</p>}
                
                <div className="flex gap-2 pt-2 mt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => handleAction(r.id, "approve")} className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => handleAction(r.id, "reject")} className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition">
                    <XCircle className="w-4 h-4" /> Reject (Spam/Abuse)
                  </button>
                </div>
              </div>
            ))}
            
            {reviews.length >= 20 && (
              <button 
                onClick={() => loadReviews(lastDoc)}
                className="w-full py-3 rounded-lg font-bold transition-all hover:bg-gray-100 border border-gray-200 mt-4"
              >
                Load More
              </button>
            )}
          </div>
        )}
      </main>
    </>
  );
}
