"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { Loader2, ImageIcon, Plus, Trash2, Edit2, Calendar, Link as LinkIcon, Power, ArrowLeft } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";
import Link from "next/link";

interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  bannerType: string;
  ctaLabel: string;
  linkType: string;
  linkTarget: string;
  isActive: boolean;
  priority: number;
  startDate: { _seconds: number } | any;
  endDate: { _seconds: number } | any;
}

export default function BannersPage() {
  const { user } = useAuth();

  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bannerType, setBannerType] = useState("promotional");
  const [ctaLabel, setCtaLabel] = useState("");
  const [linkType, setLinkType] = useState("none");
  const [linkTarget, setLinkTarget] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState(0);

  // Date State (YYYY-MM-DD for HTML5 input compatibility)
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getNextMonthStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  };

  const [startDateStr, setStartDateStr] = useState(getTodayStr());
  const [endDateStr, setEndDateStr] = useState(getNextMonthStr());

  const loadBanners = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/marketing/global/banners", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBanners(data.banners || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setBannerType("promotional");
    setCtaLabel("");
    setLinkType("none");
    setLinkTarget("");
    setIsActive(true);
    setPriority(0);
    setStartDateStr(getTodayStr());
    setEndDateStr(getNextMonthStr());
  };

  const handleEdit = (banner: BannerData) => {
    setEditingId(banner.id);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || "");
    setImageUrl(banner.imageUrl);
    setBannerType(banner.bannerType);
    setCtaLabel(banner.ctaLabel || "");
    setLinkType(banner.linkType);
    setLinkTarget(banner.linkTarget || "");
    setIsActive(banner.isActive);
    setPriority(banner.priority || 0);

    if (banner.startDate?._seconds) {
      setStartDateStr(new Date(banner.startDate._seconds * 1000).toISOString().split("T")[0]);
    }
    if (banner.endDate?._seconds) {
      setEndDateStr(new Date(banner.endDate._seconds * 1000).toISOString().split("T")[0]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) return showToast("Title and Image URL are required", "error");

    const startMs = new Date(startDateStr).getTime();
    const endMs = new Date(endDateStr).getTime();

    if (startMs > endMs) return showToast("Start date must be before end date", "error");

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const payload = {
        title,
        subtitle,
        imageUrl,
        bannerType,
        ctaLabel,
        linkType,
        linkTarget,
        isActive,
        priority: Number(priority),
        startDate: startMs,
        endDate: endMs,
      };

      const res = await fetch("/api/v1/admin/marketing/global/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          bannerId: editingId,
          banner: payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Banner ${editingId ? "updated" : "created"} successfully`, "success");
      setIsModalOpen(false);
      loadBanners();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/marketing/global/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", bannerId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      showToast("Banner deleted", "success");
      loadBanners();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/marketing/global/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "toggle_status", bannerId: id, banner: { isActive: !currentStatus } }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      loadBanners();
    } catch (err: any) {
      showToast("Failed to toggle status", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <Link href="/admin/marketing" className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-4 h-4" /> Back to Marketing Overview
      </Link>

      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Global Banners
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage promotional banners displayed across every customer storefront.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-5 h-5" /> Create Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
            <ImageIcon className="w-8 h-8 opacity-50" />
          </div>
          <p className="font-bold text-lg mb-2">No banners created</p>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            Upload a high-quality promotional image to highlight your best offers at the top of your restaurant storefront.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => {
            const isExpired = banner.endDate?._seconds ? (banner.endDate._seconds * 1000) < Date.now() : false;

            // Integrate with Campaign Activation Logic seamlessly
            // If the banner is active natively but wrapped in an expired wrapper/campaign,
            // the overarching campaign limits dictate active display limits.
            const isDimmed = !banner.isActive || isExpired;
            const statusColor = !isDimmed ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";

            return (
              <div key={banner.id} className={`rounded-2xl border overflow-hidden flex flex-col ${!isDimmed ? "" : "opacity-75 grayscale-[30%]"}`} style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="h-40 w-full relative bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                  <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                    {banner.isActive ? (isExpired ? "EXPIRED" : "ACTIVE") : "DISABLED"}
                  </div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur-md">
                    Priority: {banner.priority}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg leading-tight mb-1">{banner.title}</h3>
                  {banner.subtitle && <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{banner.subtitle}</p>}

                  <div className="mt-auto space-y-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {banner.startDate?._seconds ? new Date(banner.startDate._seconds * 1000).toLocaleDateString() : "N/A"} - {banner.endDate?._seconds ? new Date(banner.endDate._seconds * 1000).toLocaleDateString() : "N/A"}
                    </div>
                    {banner.linkType !== "none" && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Links to: {banner.linkType.toUpperCase()} ({banner.linkTarget || "No Target"})
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 mt-4 border-t" style={{ borderColor: "var(--border)" }}>
                    <button onClick={() => toggleStatus(banner.id, banner.isActive)} className="p-2 rounded-lg transition-colors hover:bg-gray-100" title={banner.isActive ? "Disable" : "Enable"}>
                      <Power className={`w-4 h-4 ${banner.isActive ? "text-green-500" : "text-gray-400"}`} />
                    </button>
                    <button onClick={() => handleEdit(banner)} className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Banner" : "Create Banner"}>
          <form onSubmit={handleSave} className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Title *</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Subtitle</label>
                <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Image URL *</label>
              <input type="url" required value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Banner Type *</label>
                <select value={bannerType} onChange={e => setBannerType(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)] bg-transparent" style={{ borderColor: "var(--border)" }}>
                  <option value="hero">Hero Banner</option>
                  <option value="promotional">Promotional Banner</option>
                  <option value="festival">Festival Banner</option>
                  <option value="offer">Offer Banner</option>
                  <option value="featured_product">Featured Product</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Display Priority</label>
                <input type="number" min="0" value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>Higher numbers show first.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Start Date *</label>
                <input type="date" required value={startDateStr} onChange={e => setStartDateStr(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">End Date *</label>
                <input type="date" required value={endDateStr} onChange={e => setEndDateStr(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-gray-50/50" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1"><LinkIcon className="w-4 h-4"/> Interaction (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">CTA Label</label>
                  <input type="text" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="e.g. Order Now" className="w-full p-2.5 rounded-lg border text-sm outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Link Type</label>
                  <select value={linkType} onChange={e => setLinkType(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none bg-transparent" style={{ borderColor: "var(--border)" }}>
                    <option value="none">No Link</option>
                    <option value="product">Product Item</option>
                    <option value="category">Menu Category</option>
                    <option value="coupon">Coupon Code</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Link Target ID</label>
                  <input type="text" value={linkTarget} disabled={linkType === "none"} onChange={e => setLinkTarget(e.target.value)} placeholder={linkType === "none" ? "N/A" : "Target ID or Name"} className="w-full p-2.5 rounded-lg border text-sm outline-none disabled:bg-gray-100 disabled:opacity-60" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 mt-2 cursor-pointer pt-2">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-semibold">Banner is Active</span>
            </label>

            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className="flex-1 py-3 rounded-xl font-semibold text-sm border hover:bg-gray-50 transition-all" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center" style={{ background: "var(--primary)" }}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Banner"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
