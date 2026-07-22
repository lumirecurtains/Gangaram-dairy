"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { useAuth } from "@/lib/contexts";
import { Loader2, Store, Plus, Trash2 } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";

export default function AdminCouponsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [maxUsesTotal, setMaxUsesTotal] = useState<number>(100);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState<number>(1);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [merchantId, setMerchantId] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return showToast("Coupon code required", "error");

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
      
      const res = await fetch("/api/v1/promotions/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "create",
          couponCode: couponCode.toUpperCase(),
          merchantId: merchantId.trim() || null,
          discountPercent,
          maxUsesTotal,
          maxUsesPerUser,
          expiresAt,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Coupon created successfully", "success");
      setCouponCode("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const code = prompt("Enter coupon code to delete:");
    if (!code) return;

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/promotions/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete", couponCode: code.toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Coupon deleted", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Coupons & Loyalty
          </h1>
          <button onClick={handleDelete} className="text-sm font-semibold text-red-500 flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Delete Coupon
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 rounded-xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h2 className="font-bold text-lg mb-4">Create New Coupon</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Coupon Code</label>
              <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} required className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} placeholder="e.g. SAVE20" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Discount %</label>
              <input type="number" min="1" max="100" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} required className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Max Uses Total</label>
              <input type="number" min="1" value={maxUsesTotal} onChange={e => setMaxUsesTotal(Number(e.target.value))} required className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Max Uses Per User</label>
              <input type="number" min="1" value={maxUsesPerUser} onChange={e => setMaxUsesPerUser(Number(e.target.value))} required className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Expires In (Days)</label>
              <input type="number" min="1" value={expiresInDays} onChange={e => setExpiresInDays(Number(e.target.value))} required className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Merchant ID (Optional)</label>
              <input type="text" value={merchantId} onChange={e => setMerchantId(e.target.value)} className="w-full p-3 rounded-lg border outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} placeholder="Leave empty for global" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="mt-4 px-6 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 w-full md:w-auto" style={{ background: "var(--primary)" }}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5"/> Create Coupon</>}
          </button>
        </form>
      </main>
    </>
  );
}
