"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { Loader2, Tag, Plus, Trash2, Edit2 } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";

interface CouponData {
  id: string;
  discountPercent: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  usesCount: number;
  expiresAt: { _seconds: number } | any;
  isActive: boolean;
  scope?: string;
  targetProductIds?: string[];
  targetCategories?: string[];
  comboProductIds?: string[];
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
}

export default function HotelCouponsPage() {
  const { user } = useAuth();

  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<CouponData> & { isNew?: boolean }>({
    id: "", discountPercent: 10, maxUsesTotal: 100, maxUsesPerUser: 1, expiresInDays: 30, isActive: true
  } as any);

  const loadCoupons = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/marketing/global/coupons", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCoupons(data.coupons || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon.id) return showToast("Coupon code required", "error");

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();

      // Calculate epoch ms for expiration based on days inputted
      const days = Number((editingCoupon as any).expiresInDays || 30);
      let expiresAtMs = Date.now() + days * 24 * 60 * 60 * 1000;

      // If editing an existing one and didn't touch days, keep existing epoch roughly
      if (!editingCoupon.isNew && editingCoupon.expiresAt) {
          expiresAtMs = editingCoupon.expiresAt._seconds ? editingCoupon.expiresAt._seconds * 1000 : Date.now() + days * 24 * 60 * 60 * 1000;
      }

      const res = await fetch("/api/v1/admin/marketing/global/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: editingCoupon.isNew ? "create" : "update",
          couponCode: editingCoupon.id.toUpperCase(),
          discountPercent: Number(editingCoupon.discountPercent),
          maxUsesTotal: Number(editingCoupon.maxUsesTotal),
          maxUsesPerUser: Number(editingCoupon.maxUsesPerUser),
          expiresAt: expiresAtMs,
          isActive: editingCoupon.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Coupon ${editingCoupon.isNew ? "created" : "updated"} successfully`, "success");
      setIsModalOpen(false);
      loadCoupons();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/marketing/global/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", couponCode: code }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      showToast("Coupon deleted", "success");
      loadCoupons();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const toggleStatus = async (code: string, currentStatus: boolean, original: any) => {
    try {
      const token = await user?.getIdToken();
      const expiresAtMs = original.expiresAt?._seconds ? original.expiresAt._seconds * 1000 : Date.now();

      const res = await fetch("/api/v1/admin/marketing/global/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "update",
          couponCode: code,
          discountPercent: original.discountPercent,
          maxUsesTotal: original.maxUsesTotal,
          maxUsesPerUser: original.maxUsesPerUser,
          expiresAt: expiresAtMs,
          isActive: !currentStatus,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      loadCoupons();
    } catch (err: any) {
      showToast("Failed to toggle status", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Global Promotions
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage platform-wide discount codes available to customers across all storefronts.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCoupon({ id: "", discountPercent: 10, maxUsesTotal: 100, maxUsesPerUser: 1, expiresInDays: 30, isActive: true, isNew: true } as any);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-5 h-5" /> Create Coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="font-medium text-lg">No global promotions found</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Create a promotion to attract more customers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(coupon => {
            const isExpired = coupon.expiresAt?._seconds ? (coupon.expiresAt._seconds * 1000) < Date.now() : false;

            return (
              <div key={coupon.id} className="p-5 rounded-xl border bg-[var(--surface)]" style={{ borderColor: "var(--border)", opacity: coupon.isActive && !isExpired ? 1 : 0.7 }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg font-mono tracking-wider bg-gray-100 px-2 py-1 rounded inline-block text-gray-800">{coupon.id}</h3>
                    <p className="text-sm font-semibold text-green-600 mt-1">{coupon.discountPercent}% OFF</p>
                  </div>
                  <button
                    onClick={() => toggleStatus(coupon.id, coupon.isActive, coupon)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {coupon.isActive ? "ACTIVE" : "INACTIVE"}
                  </button>
                </div>

                <div className="space-y-1 text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  <p>Redeemed: <b>{coupon.usesCount || 0}</b> / {coupon.maxUsesTotal}</p>
                  <p>Limit per user: <b>{coupon.maxUsesPerUser}</b></p>
                  <p className={isExpired ? "text-red-500 font-semibold" : ""}>
                    Expires: {coupon.expiresAt?._seconds ? new Date(coupon.expiresAt._seconds * 1000).toLocaleDateString() : "Unknown"}
                    {isExpired && " (Expired)"}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                  <button onClick={() => { setEditingCoupon({...coupon, isNew: false}); setIsModalOpen(true); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(coupon.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingCoupon.isNew ? "Create Coupon" : "Edit Coupon"}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                disabled={!editingCoupon.isNew}
                value={editingCoupon.id}
                onChange={e => setEditingCoupon(p => ({...p, id: e.target.value.toUpperCase()}))}
                placeholder="e.g. SUMMER20"
                className="w-full p-3 rounded-lg border text-sm outline-none font-mono tracking-wider disabled:bg-gray-50 disabled:text-gray-500 uppercase"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                autoFocus={editingCoupon.isNew}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Discount % *</label>
                <input type="number" min="1" max="100" required value={editingCoupon.discountPercent} onChange={e => setEditingCoupon(p => ({...p, discountPercent: Number(e.target.value)}))} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              {editingCoupon.isNew && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Valid For (Days) *</label>
                  <input type="number" min="1" required value={(editingCoupon as any).expiresInDays || 30} onChange={e => setEditingCoupon(p => ({...p, expiresInDays: Number(e.target.value)}))} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1">Max Total Uses *</label>
                <input type="number" min="1" required value={editingCoupon.maxUsesTotal} onChange={e => setEditingCoupon(p => ({...p, maxUsesTotal: Number(e.target.value)}))} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Uses Per Customer *</label>
                <input type="number" min="1" required value={editingCoupon.maxUsesPerUser} onChange={e => setEditingCoupon(p => ({...p, maxUsesPerUser: Number(e.target.value)}))} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
            </div>

            {/* Version 2 Smart Coupon Extensions */}
            <div className="p-4 rounded-xl border bg-gray-50/50 space-y-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-bold flex items-center gap-1">Smart Coupon Conditions (Optional)</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1">Coupon Scope</label>
                  <select
                    value={editingCoupon.scope || "global"}
                    onChange={e => setEditingCoupon(p => ({...p, scope: e.target.value}))}
                    className="w-full p-3 rounded-lg border text-sm outline-none bg-transparent"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="global">Global (Branch-wide)</option>
                    <option value="product">Product Specific</option>
                    <option value="category">Category Specific</option>
                    <option value="combo">Combo Offer</option>
                    <option value="first_order">First Order Only</option>
                    <option value="returning_customer">Returning Customer</option>
                    <option value="time_window">Time Window (Happy Hour)</option>
                  </select>
                </div>
                {editingCoupon.scope === "time_window" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Start Time</label>
                      <input type="time" value={editingCoupon.timeWindowStart || ""} onChange={e => setEditingCoupon(p => ({...p, timeWindowStart: e.target.value}))} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">End Time</label>
                      <input type="time" value={editingCoupon.timeWindowEnd || ""} onChange={e => setEditingCoupon(p => ({...p, timeWindowEnd: e.target.value}))} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
                    </div>
                  </>
                )}
                {(editingCoupon.scope === "product" || editingCoupon.scope === "combo") && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1">Target Product IDs (Comma separated)</label>
                    <input type="text" value={editingCoupon.targetProductIds?.join(", ") || ""} onChange={e => setEditingCoupon(p => ({...p, targetProductIds: e.target.value.split(",").map(s => s.trim()).filter(Boolean)}))} className="w-full p-3 rounded-lg border text-xs font-mono outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} placeholder="e.g. butter-chicken, naan" />
                  </div>
                )}
                {editingCoupon.scope === "category" && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1">Target Categories (Comma separated)</label>
                    <input type="text" value={editingCoupon.targetCategories?.join(", ") || ""} onChange={e => setEditingCoupon(p => ({...p, targetCategories: e.target.value.split(",").map(s => s.trim()).filter(Boolean)}))} className="w-full p-3 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} placeholder="e.g. Starters, Desserts" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsModalOpen(false)} disabled={submitting} type="button" className="flex-1 py-3 rounded-xl font-semibold text-sm border hover:bg-gray-50 transition-all" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 flex justify-center items-center" style={{ background: "var(--primary)" }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Coupon"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
