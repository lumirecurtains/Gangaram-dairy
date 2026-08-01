"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Clock,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Award,
  RefreshCw,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { CustomerBehaviorInsightsData } from "@/lib/firestoreHelpers";

interface CustomerBehaviorInsightsProps {
  merchantId?: string;
  authToken?: string;
}

export function CustomerBehaviorInsights({ merchantId, authToken }: CustomerBehaviorInsightsProps) {
  const [data, setData] = useState<CustomerBehaviorInsightsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        const endpoint = merchantId
          ? `/api/v1/analytics/customer-behavior?merchantId=${merchantId}&days=${days}`
          : `/api/v1/admin/analytics/customer-behavior?days=${days}`;

        const res = await fetch(endpoint, { headers });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load customer behavior insights");
        }

        const result = await res.json();
        setData(result.insights || null);
      } catch (err: any) {
        console.error("Customer behavior fetch error:", err);
        setError(err.message || "Failed to load customer behavior insights");
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [merchantId, days, authToken]);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border animate-pulse space-y-4">
        <div className="h-6 w-56 bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400 opacity-80" />
        <p className="text-sm font-medium text-text-secondary">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header & Days Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Customer Ordering Behavior Insights (A3)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Aggregated purchasing habits, peak order windows, and retention metrics
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-surface-border self-start sm:self-auto">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Retention & Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Repeat Customer Rate</span>
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {data.repeatCustomerRate}%
          </p>
          <p className="text-[10px] text-text-muted">
            {data.totalUniqueCustomers} total unique customers
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Avg Items Per Order</span>
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {data.avgItemsPerOrder}
          </p>
          <p className="text-[10px] text-text-muted">Items per basket</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Online Payment Ratio</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400">
            {data.paymentMethodBreakdown.onlinePercent}%
          </p>
          <p className="text-[10px] text-text-muted">
            {data.paymentMethodBreakdown.onlineCount} online / {data.paymentMethodBreakdown.codCount} COD
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Analysed Orders</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {data.totalOrdersAnalysed}
          </p>
          <p className="text-[10px] text-text-muted">Orders in selected window</p>
        </div>
      </div>

      {/* 24-Hour Peak Ordering Hours Chart */}
      <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          Peak Ordering Hours Distribution (24-Hour Histogram)
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} interval={2} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#151a2a",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="orderCount" fill="var(--accent, #ff6b6b)" name="Orders" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Popular Menu Items */}
      <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Top 5 Popular Menu Items
        </h3>

        <div className="space-y-3">
          {data.topPopularItems.map((item, idx) => (
            <div
              key={item.itemId}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center">
                  #{idx + 1}
                </span>
                <div>
                  <p className="font-semibold text-sm text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-secondary">{item.quantitySold} units sold</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-sm text-emerald-400">
                  ₹{item.totalRevenue.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-text-muted">Total Revenue</p>
              </div>
            </div>
          ))}

          {data.topPopularItems.length === 0 && (
            <p className="text-center py-6 text-xs text-text-muted">No item data recorded in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}
