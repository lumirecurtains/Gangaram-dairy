"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { useAuth } from "@/lib/contexts";
import { Wrench, Save, Loader2, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";

export default function AdminMaintenancePage() {
  const { user } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [lastCleanupResult, setLastCleanupResult] = useState<string | null>(null);

  // Load current maintenance state from Firestore doc platformSettings/global via client sdk or api
  const fetchMaintenanceState = useCallback(async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      // Fetch platform settings via health check or branch endpoint
      const res = await fetch("/api/v1/health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.maintenanceMode !== undefined) {
        setMaintenanceMode(!!data.maintenanceMode);
      }
      if (data.maintenanceMessage) {
        setMaintenanceMessage(data.maintenanceMessage);
      } else {
        setMaintenanceMessage("We are under scheduled maintenance. Please check back shortly.");
      }
    } catch (err: any) {
      showToast("Failed to load maintenance settings", "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMaintenanceState();
    }
  }, [user, fetchMaintenanceState]);

  // Handle saving Maintenance Mode changes using existing API /api/v1/admin/maintenance-mode
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/maintenance-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maintenanceMode,
          maintenanceMessage: maintenanceMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update maintenance mode");

      showToast(
        `Platform Maintenance Mode is now ${maintenanceMode ? "ACTIVE (Storefront Banner Enabled)" : "DISABLED"}`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle Manual Maintenance Cleanup Trigger calling existing endpoint /api/v1/cron/cleanup-idempotency-keys
  const handleTriggerCleanup = async () => {
    setRunningCleanup(true);
    setLastCleanupResult(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/cron/cleanup-idempotency-keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cleanup routine failed");

      const msg = `Deleted ${data.deletedIdempotencyKeys || 0} expired idempotency keys & ${data.deletedRateLimitCounters || 0} stale rate-limit counters.`;
      setLastCleanupResult(msg);
      showToast("System maintenance cleanup completed successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to execute cleanup job", "error");
    } finally {
      setRunningCleanup(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Wrench className="w-7 h-7" style={{ color: "var(--primary)" }} />
            Platform Maintenance &amp; Hardening
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Global emergency maintenance mode, downtime notification banner, and automated security purge triggers.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div
              className="p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{
                background: maintenanceMode ? "rgba(245, 158, 11, 0.08)" : "var(--surface)",
                borderColor: maintenanceMode ? "rgba(245, 158, 11, 0.4)" : "var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    maintenanceMode ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {maintenanceMode ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {maintenanceMode ? "Platform Maintenance ACTIVE" : "Platform Operational Normal"}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {maintenanceMode
                      ? "Storefront notice banner is currently active for all customer sessions."
                      : "All platform services, storefronts, and checkout pipelines are operating normally."}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto border p-2.5 rounded-xl bg-bg border-surface-border">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-amber-500"
                />
                <span className="text-sm font-bold">
                  {maintenanceMode ? "Maintenance On" : "Maintenance Off"}
                </span>
              </label>
            </div>

            {/* Maintenance Settings Form */}
            <form
              onSubmit={handleSaveMaintenance}
              className="p-6 rounded-2xl border bg-surface border-surface-border space-y-4"
            >
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Storefront Downtime Message Configuration
              </h2>

              <div>
                <label className="block text-xs font-semibold mb-1 text-text-secondary">
                  Maintenance Announcement Banner Message
                </label>
                <textarea
                  rows={3}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="e.g. We are undergoing scheduled system maintenance to enhance database performance. Storefront ordering will resume shortly."
                  className="w-full p-3 rounded-xl border bg-bg border-surface-border text-sm outline-none resize-none focus:border-primary"
                />
                <p className="text-xs mt-1 text-text-secondary">
                  This message will be prominently displayed at the top of all public storefront pages when maintenance mode is active.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all bg-primary hover:scale-[1.02] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Maintenance Settings
              </button>
            </form>

            {/* Manual Maintenance Cleanup Trigger Card (Module D2 Refinement) */}
            <div className="p-6 rounded-2xl border bg-surface border-surface-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-accent" />
                    Security &amp; Rate-Limit System Purge
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Manually trigger the maintenance cleanup routine to purge expired idempotency keys and stale rate limit counters.
                  </p>
                </div>
              </div>

              {lastCleanupResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{lastCleanupResult}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleTriggerCleanup}
                disabled={runningCleanup}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold border border-accent/40 text-accent hover:bg-accent/10 transition-all disabled:opacity-50 text-sm"
              >
                {runningCleanup ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <RefreshCw className="w-4 h-4" />}
                Trigger Maintenance Cleanup
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
