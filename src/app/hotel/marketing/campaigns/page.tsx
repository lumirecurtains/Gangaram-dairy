"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { Loader2, Target, Plus, Trash2, Edit2, Calendar, Power, ArrowLeft } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";
import Link from "next/link";

interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  isActive: boolean;
  bannerIds: string[];
  couponIds: string[];
  featuredSectionIds: string[];
  startDate: { _seconds: number } | any;
  endDate: { _seconds: number } | any;
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();
  
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("scheduled");
  const [isActive, setIsActive] = useState(true);

  // Reference storage
  const [bannerIdsStr, setBannerIdsStr] = useState("");
  const [couponIdsStr, setCouponIdsStr] = useState("");
  const [featuredSectionIdsStr, setFeaturedSectionIdsStr] = useState("");
  
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getNextMonthStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  };

  const [startDateStr, setStartDateStr] = useState(getTodayStr());
  const [endDateStr, setEndDateStr] = useState(getNextMonthStr());

  const loadCampaigns = useCallback(async () => {
    if (!user || !merchantId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/hotel/marketing/campaigns?merchantId=${merchantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, merchantId]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setStatus("scheduled");
    setIsActive(true);
    setStartDateStr(getTodayStr());
    setEndDateStr(getNextMonthStr());
    setBannerIdsStr("");
    setCouponIdsStr("");
    setFeaturedSectionIdsStr("");
  };

  const handleEdit = (campaign: CampaignData) => {
    setEditingId(campaign.id);
    setName(campaign.name);
    setDescription(campaign.description || "");
    setStatus(campaign.status);
    setIsActive(campaign.isActive);

    setBannerIdsStr(campaign.bannerIds?.join(", ") || "");
    setCouponIdsStr(campaign.couponIds?.join(", ") || "");
    setFeaturedSectionIdsStr(campaign.featuredSectionIds?.join(", ") || "");

    if (campaign.startDate?._seconds) {
      setStartDateStr(new Date(campaign.startDate._seconds * 1000).toISOString().split("T")[0]);
    }
    if (campaign.endDate?._seconds) {
      setEndDateStr(new Date(campaign.endDate._seconds * 1000).toISOString().split("T")[0]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return showToast("Campaign name is required", "error");

    const startMs = new Date(startDateStr).getTime();
    const endMs = new Date(endDateStr).getTime();

    if (startMs > endMs) return showToast("Start date must be before end date", "error");

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const payload = {
        name,
        description,
        status,
        isActive,
        startDate: startMs,
        endDate: endMs,
        bannerIds: bannerIdsStr.split(",").map(s => s.trim()).filter(Boolean),
        couponIds: couponIdsStr.split(",").map(s => s.trim()).filter(Boolean),
        featuredSectionIds: featuredSectionIdsStr.split(",").map(s => s.trim()).filter(Boolean),
      };

      const res = await fetch("/api/v1/hotel/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          merchantId,
          campaignId: editingId,
          campaign: payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Campaign ${editingId ? "updated" : "created"} successfully`, "success");
      setIsModalOpen(false);
      loadCampaigns();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", merchantId, campaignId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      showToast("Campaign deleted", "success");
      loadCampaigns();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = await user?.getIdToken();
      await fetch("/api/v1/hotel/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "toggle_status", merchantId, campaignId: id, campaign: { isActive: !currentStatus } }),
      });
      loadCampaigns();
    } catch (err: any) {
      showToast("Failed to toggle status", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <Link href="/hotel/marketing" className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-4 h-4" /> Back to Marketing Center
      </Link>

      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Promotional Campaigns
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Schedule and manage seasonal campaigns and targeted marketing drives.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-5 h-5" /> Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
            <Target className="w-8 h-8 opacity-50" />
          </div>
          <p className="font-bold text-lg mb-2">No campaigns created</p>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            Create a campaign to automatically bundle banners, coupons, and featured sections together.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((campaign) => {
            const isExpired = campaign.endDate?._seconds ? (campaign.endDate._seconds * 1000) < Date.now() : false;
            const statusColor = campaign.isActive && !isExpired ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";

            return (
              <div key={campaign.id} className={`rounded-2xl border flex flex-col p-5 ${campaign.isActive && !isExpired ? "" : "opacity-75 grayscale-[30%]"}`} style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg leading-tight">{campaign.name}</h3>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor} capitalize`}>
                    {campaign.isActive ? (isExpired ? "EXPIRED" : campaign.status) : "DISABLED"}
                  </div>
                </div>

                {campaign.description && <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{campaign.description}</p>}

                <div className="space-y-2 text-xs font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {campaign.startDate?._seconds ? new Date(campaign.startDate._seconds * 1000).toLocaleDateString() : "N/A"} - {campaign.endDate?._seconds ? new Date(campaign.endDate._seconds * 1000).toLocaleDateString() : "N/A"}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold mt-auto pb-4">
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100">{campaign.bannerIds?.length || 0} Banners</span>
                  <span className="px-2 py-1 rounded bg-purple-50 text-purple-600 border border-purple-100">{campaign.couponIds?.length || 0} Coupons</span>
                  <span className="px-2 py-1 rounded bg-orange-50 text-orange-600 border border-orange-100">{campaign.featuredSectionIds?.length || 0} Sections</span>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => toggleStatus(campaign.id, campaign.isActive)} className="p-2 rounded-lg transition-colors hover:bg-gray-100" title={campaign.isActive ? "Disable" : "Enable"}>
                    <Power className={`w-4 h-4 ${campaign.isActive ? "text-green-500" : "text-gray-400"}`} />
                  </button>
                  <button onClick={() => handleEdit(campaign)} className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(campaign.id)} className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Campaign" : "Create Campaign"}>
          <form onSubmit={handleSave} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold mb-1">Campaign Name *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Description</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none resize-none focus:border-[var(--primary)]" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
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

            <div className="p-4 rounded-xl border bg-gray-50/50 space-y-3" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-bold flex items-center gap-1">Content Linking (Comma separated IDs)</h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Paste the unique IDs of existing assets to attach them to this campaign.</p>
              
              <div>
                <label className="block text-xs font-semibold mb-1">Banner IDs</label>
                <input type="text" value={bannerIdsStr} onChange={e => setBannerIdsStr(e.target.value)} placeholder="e.g. bnr_123, bnr_456" className="w-full p-2.5 rounded-lg border text-xs font-mono outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Coupon IDs</label>
                <input type="text" value={couponIdsStr} onChange={e => setCouponIdsStr(e.target.value)} placeholder="e.g. SUMMER20, NEWUSER" className="w-full p-2.5 rounded-lg border text-xs font-mono outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Featured Section IDs</label>
                <input type="text" value={featuredSectionIdsStr} onChange={e => setFeaturedSectionIdsStr(e.target.value)} placeholder="e.g. feat_123" className="w-full p-2.5 rounded-lg border text-xs font-mono outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm outline-none bg-transparent" style={{ borderColor: "var(--border)" }}>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm font-semibold">Campaign is Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className="flex-1 py-3 rounded-xl font-semibold text-sm border hover:bg-gray-50 transition-all" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center" style={{ background: "var(--primary)" }}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Campaign"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
