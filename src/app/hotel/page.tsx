"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { showToast } from "@/lib/components/common/Toast";
import { Skeleton } from "@/lib/components/common/Skeleton";
import {
  LayoutDashboard,
  Store,
  MenuSquare,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface BranchMetrics {
  isOnline: boolean;
  name: string;
  slug: string;
  totalMenuItems: number;
  inStockItems: number;
  activeOrdersCount: number;
}

export default function HotelDashboardPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();

  const [metrics, setMetrics] = useState<BranchMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardMetrics = useCallback(async () => {
    if (!user || !merchantId) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const [branchRes, menuRes, ordersRes] = await Promise.all([
        fetch(`/api/v1/hotel/branch?merchantId=${merchantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/hotel/menu?merchantId=${merchantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/hotel/orders?merchantId=${merchantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const branchData = await branchRes.json();
      const menuData = await menuRes.json();
      const ordersData = await ordersRes.json();

      if (!branchRes.ok) throw new Error(branchData.error || "Failed to load branch details");

      const menuItems = menuData.items || [];
      const ordersList = ordersData.orders || [];

      const activeOrders = ordersList.filter(
        (o: any) => o.status === "paid" || o.status === "preparing" || o.status === "ready"
      );

      setMetrics({
        isOnline: !!branchData.isOnline,
        name: branchData.name || "Branch Storefront",
        slug: branchData.slug || "",
        totalMenuItems: menuItems.length,
        inStockItems: menuItems.filter((i: any) => i.isAvailable !== false).length,
        activeOrdersCount: activeOrders.length,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, merchantId]);

  useEffect(() => {
    loadDashboardMetrics();
  }, [loadDashboardMetrics]);

  return (
    <div className="p-6 max-w-6xl mx-auto w-full pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="w-7 h-7" style={{ color: "var(--accent)" }} />
            Dashboard Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Real-time branch operational status, inventory health, and active order queue.
          </p>
        </div>

        <button
          onClick={loadDashboardMetrics}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-surface border-surface-border disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-accent" : ""}`} />
          Refresh Metrics
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border bg-surface border-surface-border space-y-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-16 h-8 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl border text-center bg-surface border-surface-border mb-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500 opacity-60" />
          <p className="font-bold text-lg mb-1">Metrics Loading Error</p>
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button
            onClick={loadDashboardMetrics}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Live Metrics Grid (Module C3 Refinement) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Metric 1: Storefront Status */}
            <div className="p-6 rounded-2xl border bg-surface border-surface-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Store className="w-6 h-6" />
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    metrics?.isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {metrics?.isOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Storefront Status
                </p>
                <p className="text-2xl font-extrabold">
                  {metrics?.isOnline ? "Live Store" : "Store Offline"}
                </p>
              </div>
            </div>

            {/* Metric 2: Total Menu Items */}
            <div className="p-6 rounded-2xl border bg-surface border-surface-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-accent/10 text-accent">
                  <MenuSquare className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Total Menu Items
                </p>
                <p className="text-3xl font-extrabold text-accent">{metrics?.totalMenuItems || 0}</p>
              </div>
            </div>

            {/* Metric 3: In-Stock Items */}
            <div className="p-6 rounded-2xl border bg-surface border-surface-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  In-Stock Items
                </p>
                <p className="text-3xl font-extrabold text-blue-400">
                  {metrics?.inStockItems || 0}{" "}
                  <span className="text-xs text-text-secondary font-normal">
                    / {metrics?.totalMenuItems || 0}
                  </span>
                </p>
              </div>
            </div>

            {/* Metric 4: Active Live Orders */}
            <div className="p-6 rounded-2xl border bg-surface border-surface-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Active Live Orders
                </p>
                <p className="text-3xl font-extrabold text-amber-400">
                  {metrics?.activeOrdersCount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/hotel/branch"
              className="p-6 rounded-2xl border bg-surface border-surface-border hover:border-accent transition-all group"
            >
              <Store className="w-8 h-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold mb-1 flex items-center justify-between">
                Branch Profile <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-text-secondary">
                Manage restaurant details, operating hours, brand color, and online/offline toggle.
              </p>
            </Link>

            <Link
              href="/hotel/menu"
              className="p-6 rounded-2xl border bg-surface border-surface-border hover:border-accent transition-all group"
            >
              <MenuSquare className="w-8 h-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold mb-1 flex items-center justify-between">
                Menu &amp; Inventory <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-text-secondary">
                Manage categories, item pricing, profit margins, and bulk stock availability.
              </p>
            </Link>

            <Link
              href="/kitchen"
              className="p-6 rounded-2xl border bg-surface border-surface-border hover:border-accent transition-all group"
            >
              <ShoppingBag className="w-8 h-8 text-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold mb-1 flex items-center justify-between">
                Live Kitchen KDS <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-text-secondary">
                Open real-time Kitchen Display System for live order acceptance and preparation timers.
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

