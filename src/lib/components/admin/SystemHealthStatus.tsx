"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";

interface HealthDiagnosticData {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment: string;
  checks: {
    database: {
      status: "healthy" | "degraded" | "unhealthy";
      latencyMs: number;
      thresholdMs: number;
      error?: string;
    };
    auth: {
      status: "healthy" | "unhealthy";
      provider: string;
      error?: string;
    };
    paymentGateway: {
      status: "healthy" | "degraded" | "unhealthy";
      provider: string;
      keyIdConfigured: boolean;
      keySecretConfigured: boolean;
    };
    rateLimiter: {
      status: "healthy" | "unhealthy";
      mode: string;
    };
  };
  failureRegistry: {
    totalClasses: number;
    classes: Array<{
      id: string;
      name: string;
      scope: "BRANCH" | "PLATFORM";
      responsibleRole: string;
      description: string;
    }>;
  };
}

export function SystemHealthStatus() {
  const [data, setData] = useState<HealthDiagnosticData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchHealthDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/health?diagnostic=true");
      const result = await res.json();

      if (!res.ok && res.status !== 503) {
        throw new Error(result.error || "Failed to fetch system health diagnostics");
      }

      setData(result);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Health fetch error:", err);
      setError(err.message || "Failed to connect to health API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthDiagnostics();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border animate-pulse space-y-4">
        <div className="h-6 w-56 bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400 opacity-80" />
        <p className="text-sm font-medium text-text-secondary">{error}</p>
        <button
          onClick={fetchHealthDiagnostics}
          className="mt-4 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:opacity-90"
        >
          Retry Diagnostic
        </button>
      </div>
    );
  }

  const statusColor =
    data?.status === "healthy"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : data?.status === "degraded"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            Operational Failure Detection (B1)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time system health, database latency, and failure classification registry
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" /> Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchHealthDiagnostics}
            disabled={loading}
            className="p-2 rounded-xl bg-surface border border-surface-border text-text-secondary hover:text-text-primary transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between ${statusColor}`}>
        <div className="flex items-center gap-3">
          {data?.status === "healthy" ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          ) : data?.status === "degraded" ? (
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          ) : (
            <XCircle className="w-8 h-8 text-rose-400" />
          )}

          <div>
            <h3 className="text-lg font-bold uppercase tracking-wider">
              System Status: {data?.status}
            </h3>
            <p className="text-xs opacity-80">
              Environment: {data?.environment} • Target SLA: 99.9%
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold border border-current uppercase">
          {data?.status}
        </span>
      </div>

      {/* Dependency Diagnostic Cards */}
      {data?.checks && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Database Check */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-2">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" /> Firestore DB
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  data.checks.database.status === "healthy"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {data.checks.database.status}
              </span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {data.checks.database.latencyMs} <span className="text-xs font-normal text-text-muted">ms</span>
            </p>
            <p className="text-[10px] text-text-muted">Ping threshold &lt; 200ms</p>
          </div>

          {/* Firebase Auth Check */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-2">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" /> Firebase Auth
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                {data.checks.auth.status}
              </span>
            </div>
            <p className="text-lg font-bold text-text-primary">Verified</p>
            <p className="text-[10px] text-text-muted">Admin Auth SDK ready</p>
          </div>

          {/* Razorpay Payment Gateway Check */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-2">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-400" /> Razorpay Gateway
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  data.checks.paymentGateway.status === "healthy"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {data.checks.paymentGateway.status}
              </span>
            </div>
            <p className="text-lg font-bold text-text-primary">
              {data.checks.paymentGateway.keyIdConfigured ? "Keys Active" : "Partial Keys"}
            </p>
            <p className="text-[10px] text-text-muted">Webhook & Payment API</p>
          </div>

          {/* Rate Limiter Check */}
          <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-2">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" /> Rate Limiter
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                {data.checks.rateLimiter.status}
              </span>
            </div>
            <p className="text-lg font-bold text-text-primary">Active</p>
            <p className="text-[10px] text-text-muted">Atomic FieldValue counter</p>
          </div>
        </div>
      )}

      {/* Failure Classification Registry Table (failure-mapping.ts) */}
      {data?.failureRegistry && (
        <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-accent" />
              Registered Failure Classification Matrix (Architecture Spec §5.9)
            </h3>
            <span className="text-xs text-text-muted">
              {data.failureRegistry.totalClasses} Failure Classes Defined
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-surface-border text-xs text-text-muted">
                  <th className="pb-3 font-semibold">Failure ID</th>
                  <th className="pb-3 font-semibold">Failure Name</th>
                  <th className="pb-3 font-semibold">Scope</th>
                  <th className="pb-3 font-semibold">Responsible Role</th>
                  <th className="pb-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-xs">
                {data.failureRegistry.classes.map((fc) => (
                  <tr key={fc.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-mono text-accent font-semibold">{fc.id}</td>
                    <td className="py-3 font-medium text-text-primary">{fc.name}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          fc.scope === "PLATFORM"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {fc.scope}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-text-secondary">{fc.responsibleRole}</td>
                    <td className="py-3 text-text-muted">{fc.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
