"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts";
import {
  Activity,
  ShieldCheck,
  Clock,
  BarChart2,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PlatformHealthInsightsData } from "@/lib/firestoreHelpers";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function PlatformHealthInsights() {
  const { user } = useAuth();
  const [data, setData] = useState<PlatformHealthInsightsData | null>(null);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await user?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/v1/admin/analytics/platform-health?days=${days}`, { headers });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to fetch platform health insights");
      setData(result.insights);
    } catch (err: any) {
      console.error("Platform health fetch error:", err);
      setError(err.message || "Failed to load platform health analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthInsights();
  }, [days]);

  if (loading && !data) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border animate-pulse space-y-4">
        <div className="h-6 w-64 bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center text-xs text-text-secondary">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
        <p>{error}</p>
        <button
          onClick={fetchHealthInsights}
          className="mt-3 px-3 py-1.5 rounded-xl bg-accent text-white font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Platform Reliability & Health Analytics (B3)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Aggregated platform SLA metrics, Mean Time to Resolution (MTTR), and failure distribution trends
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-surface-border">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  days === d ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <button
            onClick={fetchHealthInsights}
            disabled={loading}
            className="p-2 rounded-xl bg-surface border border-surface-border text-text-secondary hover:text-text-primary transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Platform Uptime SLA
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Target 99.9%
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{data.uptimePercentage}%</p>
            <p className="text-[10px] text-text-muted">Calculated over past {days} days</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1">
                <Clock className="w-4 h-4 text-amber-400" /> MTTR SLA (Avg Resolution)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                Minutes
              </span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {data.mttrMinutes} <span className="text-xs font-normal text-text-muted">mins</span>
            </p>
            <p className="text-[10px] text-text-muted">Target SLA &lt; 30 mins</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Total Incidents
              </span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{data.totalIncidents}</p>
            <p className="text-[10px] text-text-muted">
              {data.resolvedIncidents} Resolved • {data.openIncidents} Open
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Resolution Rate
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">
              {data.totalIncidents > 0
                ? `${Math.round((data.resolvedIncidents / data.totalIncidents) * 100)}%`
                : "100%"}
            </p>
            <p className="text-[10px] text-text-muted">Incident lifecycle closure</p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Failure Category Distribution Bar Chart */}
          <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-accent" />
              Failure Category Frequency Distribution
            </h3>

            {data.failureDistribution.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.failureDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                      {data.failureDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-text-muted">
                No failure incidents recorded in the past {days} days.
              </div>
            )}
          </div>

          {/* Scope Breakdown Pie Chart */}
          <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-accent" />
              Incident Scope Breakdown (Branch vs. Platform)
            </h3>

            {data.scopeDistribution.some((s) => s.count > 0) ? (
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.scopeDistribution}
                      dataKey="count"
                      nameKey="scope"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.scope || ""}: ${entry.percentage || 0}%`}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-text-muted">
                No incident scope data recorded.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
