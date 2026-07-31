"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, Store, Save, AlertCircle, MapPin, UtensilsCrossed, Clock, Phone, Mail, Palette, Image as ImageIcon, RefreshCw, Info } from "lucide-react";

interface BranchProfile {
  merchantId: string;
  name: string;
  slug: string;
  city: string;
  cuisine: string;
  openingHours: string;
  contactEmail: string;
  contactPhone: string;
  isOnline: boolean;
  brandColor: string;
  ogImageUrl: string;
  promoBanner: string;
  onboardingStatus: string;
}

const EMPTY_PROFILE: BranchProfile = {
  merchantId: "",
  name: "",
  slug: "",
  city: "",
  cuisine: "",
  openingHours: "",
  contactEmail: "",
  contactPhone: "",
  isOnline: false,
  brandColor: "",
  ogImageUrl: "",
  promoBanner: "",
  onboardingStatus: "UNKNOWN",
};

export default function HotelBranchPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();

  const [profile, setProfile] = useState<BranchProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadBranch = useCallback(async () => {
    if (!user || !merchantId) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/hotel/branch?merchantId=${merchantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProfile({ ...EMPTY_PROFILE, ...data });
    } catch (err: any) {
      setError(err.message || "Failed to load branch details");
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, merchantId]);

  useEffect(() => {
    loadBranch();
  }, [loadBranch]);

  const handleFieldChange = (field: keyof BranchProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile.name.trim()) {
      showToast("Branch name is required", "error");
      return;
    }
    if (!profile.city.trim()) {
      showToast("City is required", "error");
      return;
    }
    if (profile.contactPhone && !/^[0-9+\-\s]{10,15}$/.test(profile.contactPhone.trim())) {
      showToast("Please enter a valid phone number", "error");
      return;
    }
    if (profile.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail.trim())) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (profile.ogImageUrl && !/^https?:\/\/.+\..+/.test(profile.ogImageUrl.trim())) {
      showToast("Image URL must start with http(s)://", "error");
      return;
    }
    if (profile.promoBanner && !/^https?:\/\/.+\..+/.test(profile.promoBanner.trim())) {
      showToast("Promo banner URL must start with http(s)://", "error");
      return;
    }

    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/branch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId,
          name: profile.name,
          city: profile.city,
          cuisine: profile.cuisine,
          openingHours: profile.openingHours,
          contactEmail: profile.contactEmail,
          contactPhone: profile.contactPhone,
          brandColor: profile.brandColor,
          ogImageUrl: profile.ogImageUrl,
          promoBanner: profile.promoBanner,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Branch details saved successfully", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/branch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId,
          isOnline: !profile.isOnline,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProfile((prev) => ({ ...prev, isOnline: !prev.isOnline }));
      showToast(`Branch is now ${profile.isOnline ? "offline" : "online"}`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setToggling(false);
    }
  };

  const inputClass =
    "w-full p-2.5 rounded-lg border text-sm outline-none focus:border-[var(--primary)]";
  const labelClass = "block text-sm font-semibold mb-1";

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-56 rounded-lg skeleton" />
        <div className="rounded-2xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="space-y-4">
            <div className="h-5 w-40 rounded skeleton" />
            <div className="h-10 rounded-lg skeleton" />
            <div className="h-5 w-32 rounded skeleton" />
            <div className="h-10 rounded-lg skeleton" />
            <div className="h-5 w-36 rounded skeleton" />
            <div className="h-10 rounded-lg skeleton" />
            <div className="h-11 rounded-xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "var(--error)" }} />
          <p className="font-medium mb-2">Failed to load branch details</p>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <button
            onClick={loadBranch}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-all hover:scale-105"
            style={{ background: "var(--primary)" }}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Branch Management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage your restaurant profile, contact details, and storefront visibility.
          </p>
        </div>

        <button
          onClick={handleToggleOnline}
          disabled={toggling}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 ${
            profile.isOnline ? "border" : "text-white"
          }`}
          style={
            profile.isOnline
              ? { borderColor: "var(--border)", color: "var(--text-secondary)" }
              : { background: "var(--accent)" }
          }
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className={`w-2 h-2 rounded-full ${profile.isOnline ? "bg-[var(--accent)]" : "bg-gray-400"}`} />
          )}
          {profile.isOnline ? "Go Offline" : "Go Online"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Status Banner */}
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{
            background: profile.isOnline ? "rgba(0,200,83,0.06)" : "var(--surface)",
            borderColor: profile.isOnline ? "rgba(0,200,83,0.3)" : "var(--border)",
          }}
        >
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${profile.isOnline ? "bg-[var(--accent)]" : "bg-gray-400"}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {profile.isOnline ? "Storefront is live" : "Storefront is offline"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {profile.isOnline
                ? "Customers can discover and order from your restaurant."
                : "Your restaurant is currently hidden from customer discovery."}
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <form onSubmit={handleSave} className="p-6 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Store className="w-5 h-5" style={{ color: "var(--primary)" }} />
            Basic Information
          </h2>

          <div>
            <label className={labelClass}>Restaurant Name *</label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              placeholder="e.g. Gangaram Restaurant"
              className={inputClass}
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  required
                  value={profile.city}
                  onChange={(e) => handleFieldChange("city", e.target.value)}
                  placeholder="e.g. Mumbai"
                  className={`${inputClass} pl-9`}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Cuisine</label>
              <div className="relative">
                <UtensilsCrossed className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  value={profile.cuisine}
                  onChange={(e) => handleFieldChange("cuisine", e.target.value)}
                  placeholder="e.g. North Indian"
                  className={`${inputClass} pl-9`}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Opening Hours</label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
              <input
                type="text"
                value={profile.openingHours}
                onChange={(e) => handleFieldChange("openingHours", e.target.value)}
                placeholder="e.g. 10:00 AM – 11:00 PM"
                className={`${inputClass} pl-9`}
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Store URL (Slug)</label>
            <input
              type="text"
              value={profile.slug}
              disabled
              placeholder="auto-generated"
              className={`${inputClass} opacity-60 cursor-not-allowed`}
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Your public storefront URL is: /h/{profile.slug || "..."}
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            style={{ background: "var(--primary)" }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </form>

        {/* Contact Details */}
        <form onSubmit={handleSave} className="p-6 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Phone className="w-5 h-5" style={{ color: "var(--primary)" }} />
            Contact Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="email"
                  value={profile.contactEmail}
                  onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                  placeholder="owner@restaurant.com"
                  className={`${inputClass} pl-9`}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="tel"
                  value={profile.contactPhone}
                  onChange={(e) => handleFieldChange("contactPhone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`${inputClass} pl-9`}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            style={{ background: "var(--primary)" }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </form>

        {/* Storefront & SEO */}
        <form onSubmit={handleSave} className="p-6 rounded-2xl border space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color: "var(--primary)" }} />
            Storefront &amp; SEO
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(profile.brandColor) ? profile.brandColor : "#e11d48"}
                  onChange={(e) => handleFieldChange("brandColor", e.target.value)}
                  className="w-12 h-10 rounded-lg border cursor-pointer flex-shrink-0"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
                <input
                  type="text"
                  value={profile.brandColor}
                  onChange={(e) => handleFieldChange("brandColor", e.target.value)}
                  placeholder="#e11d48"
                  className={inputClass}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Promo Banner URL</label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="url"
                  value={profile.promoBanner}
                  onChange={(e) => handleFieldChange("promoBanner", e.target.value)}
                  placeholder="https://..."
                  className={`${inputClass} pl-9`}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>OpenGraph Image URL</label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
              <input
                type="url"
                value={profile.ogImageUrl}
                onChange={(e) => handleFieldChange("ogImageUrl", e.target.value)}
                placeholder="https://..."
                className={`${inputClass} pl-9`}
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
            </div>
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
              <Info className="w-3 h-3" />
              Used when your storefront is shared on social media.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            style={{ background: "var(--primary)" }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
