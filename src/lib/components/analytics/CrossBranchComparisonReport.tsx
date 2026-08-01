"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Calendar,
  AlertTriangle,
  BarChart3,
  Award,
  ArrowUpDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { CrossBranchPerformanceItem } from "@/lib/firestoreHelpers";

interface CrossBranchComparisonReportProps {
  authToken?: string;
}

export function CrossBranchComparisonReport({ authToken }: CrossBranchComparisonReportProps) {
  const [branches, setBranches] = useState<CrossBranchPerformanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [days, setDays] = useState<number>(30);
  const [sortBy, setSortBy] = useState<"grossRevenue" | "totalOrders" | "avgOrderValue">("grossRevenue");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComparison() {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        const res = await fetch(`/api/v1/admin/analytics/cross-branch?days=${days}`, {
          headers,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load cross-branch comparison analytics");
        }

        const result = await res.json();
        setBranches(result.comparison || []);
      } catch (err: any) {
        console.error("Cross-branch analytics fetch error:", err);
        setError(err.message || "Failed to load cross-branch analytics");
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [days, authToken]);

  const sortedBranches = [...branches].sort((a, b) => b[sortBy] - a[sortBy]);

  const topRevenueBranch = branches.length > 0 ? [...branches].sort((a, b) => b.grossRevenue - a.grossRevenue)[0] : null;
  const topVolumeBranch = branches.length > 0 ? [...branches].sort((a, b) => b.totalOrders - a.totalOrders)[0] : null;
  const totalNetworkRevenue = branches.reduce((sum, b) => sum + b.grossRevenue, 0);
  const totalNetworkOrders = branches.reduce((sum, b) => sum + b.totalOrders, 0);

  const chartData = sortedBranches.map((b) => ({
    name: b.branchName.length > 12 ? b.branchName.substring(0, 12) + "..." : b.branchName,
    revenue: b.grossRevenue,
    orders: b.totalOrders,
    hotelShare: b.hotelShareTotal,
  }));

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border animate-pulse space-y-4">
        <div className="h-6 w-56 bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-white/5 rounded-xl" />
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

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
            Cross-Branch Comparison (A2)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Platform Owner side-by-side performance analytics across all active branches
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Days Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-surface-border">
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
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Total Network Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            ₹{totalNetworkRevenue.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-text-muted">Across {branches.length} branches</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Top Revenue Branch</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-text-primary truncate">
            {topRevenueBranch ? topRevenueBranch.branchName : "N/A"}
          </p>
          <p className="text-xs text-amber-400 font-semibold">
            {topRevenueBranch ? `₹${topRevenueBranch.grossRevenue.toLocaleString("en-IN")}` : "-"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Top Order Volume</span>
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-lg font-bold text-text-primary truncate">
            {topVolumeBranch ? topVolumeBranch.branchName : "N/A"}
          </p>
          <p className="text-xs text-indigo-400 font-semibold">
            {topVolumeBranch ? `${topVolumeBranch.totalOrders} orders` : "-"}
          </p>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      {chartData.length > 0 && (
        <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              Branch Revenue & Order Comparison
            </h3>

            {/* Sort Toggle */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs text-text-primary outline-none"
              >
                <option value="grossRevenue">Gross Revenue</option>
                <option value="totalOrders">Order Volume</option>
                <option value="avgOrderValue">Avg Order Value</option>
              </select>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#151a2a",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="revenue" fill="var(--accent, #ff6b6b)" name="Revenue (₹)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="hotelShare" fill="#38d9a9" name="Hotel Share (₹)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comparison Data Table */}
      <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-text-secondary" />
          Branch Performance Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-xs text-text-muted">
                <th className="pb-3 font-semibold">Branch</th>
                <th className="pb-3 font-semibold">City</th>
                <th className="pb-3 font-semibold text-right">Orders</th>
                <th className="pb-3 font-semibold text-right">Gross Revenue</th>
                <th className="pb-3 font-semibold text-right">Hotel Share (70%)</th>
                <th className="pb-3 font-semibold text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {sortedBranches.map((b) => (
                <tr key={b.merchantId} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 font-medium text-text-primary">{b.branchName}</td>
                  <td className="py-3 text-text-secondary text-xs">{b.city}</td>
                  <td className="py-3 text-right font-semibold">{b.totalOrders}</td>
                  <td className="py-3 text-right font-semibold text-emerald-400">
                    ₹{b.grossRevenue.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 text-right font-semibold text-amber-400">
                    ₹{b.hotelShareTotal.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 text-right text-text-secondary">₹{b.avgOrderValue}</td>
                </tr>
              ))}

              {sortedBranches.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    No active branches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
