"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/contexts";
import { Loader2, Megaphone, Search, Store } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import Link from "next/link";
import { Navbar } from "@/lib/components/layout/Navbar";

export default function AdminMarketingPage() {
  const { user } = useAuth();
  
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadMerchants() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/v1/admin/merchants/status", { // Reusing standard status API purely to fetch the merchant directory structure if available, or we fetch a custom aggregate list if necessary. For now, we'll build a dedicated Marketing repository read to extract active campaigns.
          method: "GET",
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Let's implement a proper targeted repository read instead to guarantee separation of concerns.
        const req = await fetch("/api/v1/admin/marketing/overview", {
           headers: { Authorization: `Bearer ${token}` }
        });
        const data = await req.json();
        if (!req.ok) throw new Error(data.error);

        setMerchants(data.overview || []);
      } catch (err: any) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
    loadMerchants();
  }, [user]);

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
                    <p className="text-xl font-bold">{merchant.activeBanners || 0}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Banners</p>
                  </div>
                  <div className="border-l border-r" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xl font-bold">{merchant.activeCampaigns || 0}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Campaigns</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{merchant.activeFeatured || 0}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Featured</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
