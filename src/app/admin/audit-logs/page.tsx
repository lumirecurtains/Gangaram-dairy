"use client";

import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { useAuth } from "@/lib/contexts";
import { Loader2, ClipboardList, Search, Download, Eye, ShieldAlert, KeyRound, ShoppingBag, CreditCard, Server } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";

type CategoryFilter = "ALL" | "AUTH" | "ORDER" | "PAYMENT" | "SECURITY" | "SYSTEM";

interface AuditLog {
  id: string;
  action: string;
  actorUid: string;
  targetPath: string;
  beforeState: Record<string, any> | null;
  afterState: Record<string, any> | null;
  timestamp: { seconds?: number; nanoseconds?: number } | null;
}

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  // Module D1 State
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);

  const fetchLogs = async (currentCursor: string | null = null) => {
    try {
      const token = await user?.getIdToken();
      let url = "/api/v1/admin/audit-logs?limit=50";
      if (currentCursor) {
        url += `&cursor=${currentCursor}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (currentCursor) {
        setLogs((prev) => [...prev, ...data.logs]);
      } else {
        setLogs(data.logs);
      }
      setCursor(data.nextCursor);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  // Derive category badge configuration (Module D1 Refinement)
  const getActionCategory = (action: string): CategoryFilter => {
    const act = (action || "").toUpperCase();
    if (act.includes("AUTH") || act.includes("LOGIN") || act.includes("TOKEN") || act.includes("CLAIM")) {
      return "AUTH";
    }
    if (act.includes("ORDER") || act.includes("PREPARE") || act.includes("DELIVER") || act.includes("CANCEL")) {
      return "ORDER";
    }
    if (act.includes("PAYMENT") || act.includes("RAZORPAY") || act.includes("REFUND") || act.includes("WEBHOOK")) {
      return "PAYMENT";
    }
    if (act.includes("BAN") || act.includes("SECURITY") || act.includes("PIN") || act.includes("OVERRIDE") || act.includes("MAINTENANCE")) {
      return "SECURITY";
    }
    return "SYSTEM";
  };

  // Filtered log computations
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const category = getActionCategory(log.action);
      const matchesCategory = selectedCategory === "ALL" || category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.action?.toLowerCase().includes(q) ||
        log.actorUid?.toLowerCase().includes(q) ||
        log.targetPath?.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [logs, selectedCategory, searchQuery]);

  // Export CSV Helper (Module D1 Refinement)
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast("No audit logs available to export", "error");
      return;
    }

    const headers = ["Timestamp", "Category", "Action", "Actor UID", "Target Path"];
    const rows = filteredLogs.map((log) => {
      const date = log.timestamp?.seconds
        ? new Date(log.timestamp.seconds * 1000).toISOString()
        : "Unknown";
      const cat = getActionCategory(log.action);
      return [
        `"${date}"`,
        `"${cat}"`,
        `"${log.action || ""}"`,
        `"${log.actorUid || ""}"`,
        `"${log.targetPath || ""}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gangaram_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Audit logs exported to CSV cleanly", "success");
  };

  const renderBadge = (category: CategoryFilter) => {
    switch (category) {
      case "AUTH":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1 w-fit">
            <KeyRound className="w-3 h-3" /> AUTH
          </span>
        );
      case "ORDER":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit">
            <ShoppingBag className="w-3 h-3" /> ORDER
          </span>
        );
      case "PAYMENT":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
            <CreditCard className="w-3 h-3" /> PAYMENT
          </span>
        );
      case "SECURITY":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3 h-3" /> SECURITY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30 flex items-center gap-1 w-fit">
            <Server className="w-3 h-3" /> SYSTEM
          </span>
        );
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full pb-24">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" style={{ color: "var(--primary)" }} />
              System Audit Logs
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Immutable administrative event history, security audit trail, and payload diff inspector.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV ({filteredLogs.length})
          </button>
        </div>

        {/* Toolbar: Search Input & Category Pills (Module D1 Refinement) */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action, actor UID, or target path..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-surface border-surface-border text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
            {(["ALL", "AUTH", "ORDER", "PAYMENT", "SECURITY", "SYSTEM"] as CategoryFilter[]).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    selectedCategory === cat
                      ? "bg-primary text-white border-primary"
                      : "bg-surface border-surface-border text-text-secondary hover:text-text"
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div
              className="overflow-x-auto rounded-xl border mb-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  >
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Action</th>
                    <th className="p-4 font-semibold">Actor UID</th>
                    <th className="p-4 font-semibold">Target Path</th>
                    <th className="p-4 font-semibold">Time</th>
                    <th className="p-4 font-semibold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const date = log.timestamp?.seconds
                      ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                      : "Unknown";
                    const cat = getActionCategory(log.action);

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setInspectingLog(log)}
                        className="border-b last:border-0 hover:bg-bg/50 cursor-pointer transition-colors"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <td className="p-4">{renderBadge(cat)}</td>
                        <td className="p-4 font-bold">{log.action}</td>
                        <td className="p-4 font-mono text-xs">{log.actorUid}</td>
                        <td className="p-4 font-mono text-xs text-text-secondary">{log.targetPath}</td>
                        <td className="p-4 text-xs text-text-secondary whitespace-nowrap">{date}</td>
                        <td className="p-4 text-right">
                          <button className="p-1.5 rounded-lg hover:bg-surface border border-surface-border text-accent">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="p-12 text-center text-text-secondary">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-base mb-1">No matching audit logs</p>
                  <p className="text-xs">Try adjusting your filter category or search query.</p>
                </div>
              )}
            </div>

            {cursor && (
              <button
                onClick={() => fetchLogs(cursor)}
                className="w-full py-3 rounded-xl font-bold transition-all bg-surface hover:bg-bg border border-surface-border text-sm"
              >
                Load More Logs
              </button>
            )}
          </>
        )}

        {/* Audit Detail Inspector Modal (Module D1 Refinement) */}
        {inspectingLog && (
          <Modal
            isOpen={true}
            onClose={() => setInspectingLog(null)}
            title="Audit Event Inspector"
          >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between p-3 rounded-xl border bg-bg border-surface-border">
                <div>
                  <p className="text-xs font-semibold text-text-secondary">Action</p>
                  <p className="font-bold text-base">{inspectingLog.action}</p>
                </div>
                {renderBadge(getActionCategory(inspectingLog.action))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-bg border-surface-border">
                  <p className="font-semibold text-text-secondary mb-1">Actor UID</p>
                  <p className="font-mono text-xs break-all">{inspectingLog.actorUid}</p>
                </div>
                <div className="p-3 rounded-xl border bg-bg border-surface-border">
                  <p className="font-semibold text-text-secondary mb-1">Target Path</p>
                  <p className="font-mono text-xs break-all">{inspectingLog.targetPath}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-bg border-surface-border text-xs">
                <p className="font-semibold text-text-secondary mb-1">Event Timestamp</p>
                <p className="font-mono text-xs">
                  {inspectingLog.timestamp?.seconds
                    ? new Date(inspectingLog.timestamp.seconds * 1000).toUTCString()
                    : "N/A"}
                </p>
              </div>

              {/* State Diff Inspector */}
              <div className="space-y-3 pt-2">
                <div>
                  <p className="text-xs font-bold mb-1.5 text-text-secondary uppercase tracking-wider">
                    Before State (Payload)
                  </p>
                  <pre className="p-3 rounded-xl border bg-black/40 text-emerald-400 font-mono text-xs overflow-x-auto max-h-48">
                    {inspectingLog.beforeState
                      ? JSON.stringify(inspectingLog.beforeState, null, 2)
                      : "null (None)"}
                  </pre>
                </div>

                <div>
                  <p className="text-xs font-bold mb-1.5 text-text-secondary uppercase tracking-wider">
                    After State (Payload)
                  </p>
                  <pre className="p-3 rounded-xl border bg-black/40 text-blue-400 font-mono text-xs overflow-x-auto max-h-48">
                    {inspectingLog.afterState
                      ? JSON.stringify(inspectingLog.afterState, null, 2)
                      : "null (None)"}
                  </pre>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </>
  );
}

