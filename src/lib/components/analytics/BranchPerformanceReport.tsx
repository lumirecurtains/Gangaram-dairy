"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Calendar,
  AlertTriangle,
  BarChart3,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import type { MerchantDailyStats } from "@/lib/firestoreSchema";

interface BranchPerformanceData {
  merchantId: string;
  totalOrders: number;
  grossRevenue: number;
  hotelShareTotal: number;
  riderShareTotal: number;
  avgOrderValue: number;
  cancelledCount: number;
  dailyStats: MerchantDailyStats[];
}

interface BranchPerformanceReportProps {
  merchantId: string;
  authToken?: string;
}

export function BranchPerformanceReport({
  merchantId,
  authToken,
}: BranchPerformanceReportProps) {
  const [data, setData] = useState<BranchPerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        const res = await fetch(`/api/v1/analytics?merchantId=${merchantId}&days=${days}`, {
          headers,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load performance analytics");
        }

        const result = await res.json();
        setData(result.report);
      } catch (err: any) {
        console.error("Analytics fetch error:", err);
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    if (merchantId) {
      fetchAnalytics();
    }
  }, [merchantId, days, authToken]);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border animate-pulse space-y-4">
        <div className="h-6 w-48 bg-white/10 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400 opacity-80" />
        <p className="text-sm font-medium text-text-secondary">
          {error || "No performance data available"}
        </p>
      </div>
    );
  }

  // Formatting chart data
  const chartData = data.dailyStats
    .slice()
    .reverse()
    .map((stat) => ({
      date: stat.date,
      revenue: stat.grossRevenue,
      orders: stat.orderCount,
      hotelShare: stat.hotelShareTotal,
    }));

  return (
    <div className="space-y-6">
      {/* Header & Days Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            Branch Performance (A1)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Verified sales, revenue split, and order activity analytics
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-surface-border self-start sm:self-auto">
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Gross Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            ₹{data.grossRevenue.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-text-muted">Total customer payments</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {data.totalOrders}
          </p>
          <p className="text-[10px] text-text-muted">
            Completed: {data.totalOrders} | Cancelled: {data.cancelledCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Avg Order Value</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400">
            ₹{data.avgOrderValue}
          </p>
          <p className="text-[10px] text-text-muted">Per order average</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Hotel Earnings</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">
            ₹{data.hotelShareTotal.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-text-muted">70% net branch share</p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {chartData.length > 0 && (
        <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-secondary" />
            Revenue & Order Trend
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent, #ff6b6b)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent, #ff6b6b)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#151a2a",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent, #ff6b6b)"
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  strokeWidth={2}
                  name="Gross Revenue (₹)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
