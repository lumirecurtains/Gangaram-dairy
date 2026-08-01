"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth, useMerchant } from "@/lib/contexts";
import { showToast } from "@/lib/components/common/Toast";
import { CustomerBehaviorInsights } from "@/lib/components/analytics/CustomerBehaviorInsights";
import { Loader2, TrendingUp, Filter, IndianRupee, Package, XCircle, Clock, ShieldAlert, UtensilsCrossed, Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

interface MerchantAnalyticsResult {
  stats: any[];
  totalOrderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface OperationalInsights {
  totalItems: number;
  availableItems: number;
  outOfStockItems: number;
  activeStaffCount: number;
}

export default function HotelAnalyticsPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "today">("7days");
  
  const [financialData, setFinancialData] = useState<MerchantAnalyticsResult | null>(null);
  const [operationalData, setOperationalData] = useState<OperationalInsights | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !merchantId) return;
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const end = new Date();
      let start = new Date();

      if (dateRange === "7days") start.setDate(end.getDate() - 7);
      else if (dateRange === "30days") start.setDate(end.getDate() - 30);
      
      const fromStr = start.toISOString().split("T")[0];
      const toStr = end.toISOString().split("T")[0];

      // Fetch Financial Rollups (Reuses existing Module 13 API)
      const resFin = await fetch(`/api/v1/analytics/merchant?merchantId=${merchantId}&from=${fromStr}&to=${toStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const finData = await resFin.json();
      if (!resFin.ok) throw new Error(finData.error);
      
      setFinancialData(finData);

      // Fetch Operational Insights (Menu & Staff)
      const resOps = await fetch(`/api/v1/hotel/analytics/operational?merchantId=${merchantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const opsData = await resOps.json();
      if (!resOps.ok) throw new Error(opsData.error);

      setOperationalData(opsData);

    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, merchantId, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Derive charts
  const chartData = useMemo(() => {
    if (!financialData?.stats) return [];
    return financialData.stats.map(s => ({
      date: s.date.slice(5), // mm-dd
      orders: s.orderCount,
      revenue: s.grossRevenue,
      cancelled: s.cancelledCount || 0
    }));
  }, [financialData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Analytics & Reports
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Business performance and operational insights for your branch.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)]">
          <Filter className="w-4 h-4 ml-2" style={{ color: "var(--text-secondary)" }} />
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-transparent text-sm outline-none font-medium cursor-pointer pr-4"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            <IndianRupee className="w-4 h-4" /> Gross Revenue
          </div>
          <p className="text-2xl font-bold">₹{financialData?.totalRevenue?.toLocaleString() || 0}</p>
        </div>
        <div className="p-5 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            <Package className="w-4 h-4" /> Total Orders
          </div>
          <p className="text-2xl font-bold">{financialData?.totalOrderCount?.toLocaleString() || 0}</p>
        </div>
        <div className="p-5 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            <TrendingUp className="w-4 h-4" /> Avg. Order Value
          </div>
          <p className="text-2xl font-bold">₹{financialData?.avgOrderValue?.toLocaleString() || 0}</p>
        </div>
        <div className="p-5 rounded-xl border bg-red-50/50 border-red-100">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-red-600">
            <XCircle className="w-4 h-4" /> Cancelled Orders
          </div>
          <p className="text-2xl font-bold text-red-700">
            {financialData?.stats.reduce((sum, s) => sum + (s.cancelledCount || 0), 0) || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 p-6 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
          <h2 className="text-lg font-bold mb-6">Revenue & Order Trends</h2>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: "var(--text-secondary)" }}>
              No data available for this period.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line yAxisId="left" type="monotone" name="Revenue (₹)" dataKey="revenue" stroke="var(--accent)" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                  <Line yAxisId="right" type="monotone" name="Orders" dataKey="orders" stroke="var(--primary)" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Operational Summary */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Menu Health
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Items</span>
                <span className="font-bold">{operationalData?.totalItems || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>In Stock</span>
                <span className="font-bold text-green-600">{operationalData?.availableItems || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
                <span className="text-sm font-medium flex items-center gap-1.5 text-red-600">
                  <ShieldAlert className="w-4 h-4" /> Out of Stock
                </span>
                <span className="font-bold text-red-600">{operationalData?.outOfStockItems || 0}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: "var(--primary)" }} />
              Active Workforce
            </h2>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Kitchen Staff</span>
              <span className="font-bold">{operationalData?.activeStaffCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module A3: Customer Ordering Behavior Insights */}
      {merchantId && (
        <div className="mt-10 pt-8 border-t border-[var(--border)]">
          <CustomerBehaviorInsights merchantId={merchantId} />
        </div>
      )}
    </div>
  );
}
