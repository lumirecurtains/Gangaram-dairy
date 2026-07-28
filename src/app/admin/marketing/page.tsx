"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/contexts";
import { ImageIcon, Loader2, Megaphone, Search, Store, Tag, Target } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import Link from "next/link";
import { Navbar } from "@/lib/components/layout/Navbar";

export default function AdminMarketingPage() {
  const { user } = useAuth();
  
  const [merchants, setMerchants] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        
        const [reqMerchants, reqGlobal] = await Promise.all([
          fetch("/api/v1/admin/marketing/overview", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/v1/admin/marketing/global", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const dataMerchants = await reqMerchants.json();
        const dataGlobal = await reqGlobal.json();
        
        if (!reqMerchants.ok) throw new Error(dataMerchants.error);
        if (!reqGlobal.ok) throw new Error(dataGlobal.error);

        setMerchants(dataMerchants.overview || []);
        setGlobalConfig(dataGlobal.config || { bannersEnabled: true, campaignsEnabled: true, featuredEnabled: true, couponsEnabled: true });
      } catch (err: any) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const toggleGlobalConfig = async (key: string, currentValue: boolean) => {
    try {
      const token = await user?.getIdToken();
      const payload = { ...globalConfig, [key]: !currentValue };
      
      // Optimistic
      setGlobalConfig(payload);

      const res = await fetch("/api/v1/admin/marketing/global", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ config: payload })
      });

      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Platform configuration updated", "success");
    } catch (err: any) {
      showToast(err.message, "error");
      // Revert optimistic on fail
      setGlobalConfig((prev: any) => ({ ...prev, [key]: currentValue }));
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return merchants;
    const lower = searchQuery.toLowerCase();
    return merchants.filter(m => 
      m.merchantId.toLowerCase().includes(lower) || 
      (m.name || "").toLowerCase().includes(lower)
    );
  }, [merchants, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
         <Navbar />
         <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full pb-24">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6" style={{ color: "var(--primary)" }} />
              Global Marketing Overview
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Monitor active banners, campaigns, and featured sections across all branches. Read-only.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search merchant ID or name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none focus:border-[var(--primary)]"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            />
          </div>
        </div>

        <nav aria-label="Marketing navigation" className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/admin/marketing", label: "Overview", icon: Megaphone },
            { href: "/admin/marketing/banners", label: "Global Banners", icon: ImageIcon },
            { href: "/admin/marketing/campaigns", label: "Global Campaigns", icon: Target },
            { href: "/admin/marketing/promotions", label: "Global Promotions", icon: Tag },
          ].map((item) => {
            const isCurrent = item.href === "/admin/marketing";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${isCurrent ? "bg-[var(--primary-light)]" : "bg-[var(--surface)] hover:bg-gray-50"}`}
                style={{ borderColor: "var(--border)", color: isCurrent ? "var(--primary)" : "var(--text)" }}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Platform Default Controls */}
        {globalConfig && (
          <div className="mb-8 p-6 rounded-2xl border bg-gray-50/50" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-bold text-lg mb-4">Platform Marketing Settings</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={globalConfig.bannersEnabled} onChange={() => toggleGlobalConfig("bannersEnabled", globalConfig.bannersEnabled)} className="w-4 h-4" />
                <span className="text-sm font-semibold">Enable Banners</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={globalConfig.campaignsEnabled} onChange={() => toggleGlobalConfig("campaignsEnabled", globalConfig.campaignsEnabled)} className="w-4 h-4" />
                <span className="text-sm font-semibold">Enable Campaigns</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={globalConfig.featuredEnabled} onChange={() => toggleGlobalConfig("featuredEnabled", globalConfig.featuredEnabled)} className="w-4 h-4" />
                <span className="text-sm font-semibold">Enable Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={globalConfig.couponsEnabled} onChange={() => toggleGlobalConfig("couponsEnabled", globalConfig.couponsEnabled)} className="w-4 h-4" />
                <span className="text-sm font-semibold">Enable Coupons</span>
              </label>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
              * Toggling these settings configures the platform-wide fallback default. Individual merchants can still be forcibly disabled below.
            </p>
          </div>
        )}

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Total Active Banners</p>
            <p className="text-2xl font-black">{merchants.reduce((sum, m) => sum + (m.activeBanners || 0), 0)}</p>
          </div>
          <div className="p-5 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Total Active Campaigns</p>
            <p className="text-2xl font-black">{merchants.reduce((sum, m) => sum + (m.activeCampaigns || 0), 0)}</p>
          </div>
          <div className="p-5 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Total Active Featured Sections</p>
            <p className="text-2xl font-black">{merchants.reduce((sum, m) => sum + (m.activeFeatured || 0), 0)}</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <p className="font-medium text-lg">No marketing activity found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(merchant => (
              <div key={merchant.merchantId} className="p-5 rounded-xl border bg-[var(--surface)] flex flex-col" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{merchant.name || "Unknown Branch"}</h3>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{merchant.merchantId}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${merchant.onboardingStatus === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {merchant.onboardingStatus}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mt-auto border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-xl font-bold opacity-50">{merchant.marketingConfig?.bannersEnabled === false ? "0" : merchant.activeBanners || 0}</p>
                    <p className={`text-[10px] uppercase font-bold ${merchant.marketingConfig?.bannersEnabled === false ? "text-red-500" : "text-gray-500"}`}>
                      {merchant.marketingConfig?.bannersEnabled === false ? "Banners (Disabled)" : "Banners"}
                    </p>
                  </div>
                  <div className="border-l border-r" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xl font-bold opacity-50">{merchant.marketingConfig?.campaignsEnabled === false ? "0" : merchant.activeCampaigns || 0}</p>
                    <p className={`text-[10px] uppercase font-bold ${merchant.marketingConfig?.campaignsEnabled === false ? "text-red-500" : "text-gray-500"}`}>
                      {merchant.marketingConfig?.campaignsEnabled === false ? "Campaigns (Disabled)" : "Campaigns"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-bold opacity-50">{merchant.marketingConfig?.featuredEnabled === false ? "0" : merchant.activeFeatured || 0}</p>
                    <p className={`text-[10px] uppercase font-bold ${merchant.marketingConfig?.featuredEnabled === false ? "text-red-500" : "text-gray-500"}`}>
                      {merchant.marketingConfig?.featuredEnabled === false ? "Featured (Disabled)" : "Featured"}
                    </p>
                  </div>
                </div>

                {/* Merchant Settings Editor Trigger */}
                <div className="mt-4 pt-3 flex justify-end border-t" style={{ borderColor: "var(--border)" }}>
                  <button 
                    onClick={async () => {
                      const token = await user?.getIdToken();
                      const current = merchant.marketingConfig || { bannersEnabled: true, campaignsEnabled: true, featuredEnabled: true, couponsEnabled: true };
                      const toggled = !current.bannersEnabled; // Toggle all for demo, typically a modal would split these.
                      
                      const payload = {
                        bannersEnabled: toggled,
                        campaignsEnabled: toggled,
                        featuredEnabled: toggled,
                        couponsEnabled: toggled
                      };
                      
                      try {
                        await fetch("/api/v1/admin/marketing/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ merchantId: merchant.merchantId, marketingConfig: payload })
                        });
                        showToast(`Marketing features ${toggled ? "enabled" : "disabled"} for ${merchant.name}`, "success");
                        // force reload trick
                        window.location.reload();
                      } catch (err: any) {
                        showToast(err.message, "error");
                      }
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    Toggle Feature Flags
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
