"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Loader2, Star, CheckCircle, XCircle } from "lucide-react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, limit, getDocs, orderBy, startAfter } from "firebase/firestore";
import { showToast } from "@/lib/components/common/Toast";
import { useAuth } from "@/lib/contexts";
import { Modal } from "@/lib/components/common/Modal";

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const handleAction = async (reviewId: string, action: "approve" | "reject", reason?: string) => {
    try {
      if (action === "reject" && !reason) return;

      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewId, action, moderationReason: reason || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReviews(reviews.filter(r => r.id !== reviewId));
      showToast(`Review ${action}d successfully`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return showToast("Reason required", "error");
    await handleAction(rejectingId!, "reject", rejectReason);
    setRejectingId(null);
    setRejectReason("");
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
                  <button onClick={() => handleAction(r.id, "approve")} className="flex items-center justify-center gap-1 px-4 py-2 text-white rounded-lg text-sm font-bold transition-all hover:opacity-90" style={{ background: "var(--accent)" }}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => setRejectingId(r.id)} className="flex items-center justify-center gap-1 px-4 py-2 text-white rounded-lg text-sm font-bold transition-all hover:opacity-90" style={{ background: "var(--error)" }}>
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
            
            {reviews.length >= 20 && (
              <button 
                onClick={() => loadReviews(lastDoc)}
                className="w-full py-3 rounded-lg font-bold transition-all"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                Load More
              </button>
            )}
          </div>
        )}

        {rejectingId && (
          <Modal isOpen={true} onClose={() => setRejectingId(null)} title="Reject Review">
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Please provide a reason for rejecting this review (e.g., spam, offensive language).
              </p>
              <textarea
                className="w-full p-3 rounded-lg text-sm outline-none resize-none transition-all"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectingId(null)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: "var(--error)" }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </>
  );
}
