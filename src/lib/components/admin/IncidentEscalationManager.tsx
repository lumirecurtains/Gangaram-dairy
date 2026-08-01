"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  RefreshCw,
  Plus,
  AlertTriangle,
  Send,
} from "lucide-react";

export interface IncidentRecord {
  id: string;
  failureId: string;
  scope: "BRANCH" | "PLATFORM";
  responsibleRole: string;
  merchantId?: string | null;
  description: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: any;
  updatedAt: any;
  acknowledgedAt?: any;
  resolvedAt?: any;
}

interface IncidentEscalationManagerProps {
  merchantId?: string;
  isSuperAdmin?: boolean;
}

export function IncidentEscalationManager({ merchantId, isSuperAdmin = true }: IncidentEscalationManagerProps) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulation Form State
  const [showSimulateModal, setShowSimulateModal] = useState<boolean>(false);
  const [simFailureId, setSimFailureId] = useState<string>("PAYMENT_PROCESSING_ERROR");
  const [simDescription, setSimDescription] = useState<string>("");
  const [simulating, setSimulating] = useState<boolean>(false);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = merchantId
        ? `/api/v1/hotel/incidents?merchantId=${merchantId}`
        : `/api/v1/admin/incidents${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch operational incidents");
      setIncidents(data.incidents || []);
    } catch (err: any) {
      console.error("Incidents fetch error:", err);
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [merchantId, statusFilter]);

  const updateIncidentStatus = async (incidentId: string, newStatus: "acknowledged" | "resolved") => {
    setUpdatingId(incidentId);
    try {
      const endpoint = merchantId ? `/api/v1/hotel/incidents` : `/api/v1/admin/incidents`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, status: newStatus }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update incident status");

      // Optimistic update
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc))
      );
    } catch (err: any) {
      console.error("Status update error:", err);
      alert(err.message || "Failed to update incident status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSimulateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDescription.trim()) return;
    setSimulating(true);

    try {
      const res = await fetch("/api/v1/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          failureId: simFailureId,
          merchantId: merchantId || null,
          description: simDescription,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to simulate incident");

      setSimDescription("");
      setShowSimulateModal(false);
      fetchIncidents();
    } catch (err: any) {
      alert(err.message || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) =>
    statusFilter === "all" ? true : inc.status === statusFilter
  );

  const openCount = incidents.filter((i) => i.status === "open").length;
  const ackCount = incidents.filter((i) => i.status === "acknowledged").length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-accent" />
            Automated Alerting & Incident Escalation (B2)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Operational failure alert routing, SLA escalation tracking, and role-assigned incident management
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isSuperAdmin && (
            <button
              onClick={() => setShowSimulateModal(true)}
              className="px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md shadow-accent/20"
            >
              <Plus className="w-3.5 h-3.5" /> Raise Incident
            </button>
          )}

          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="p-2 rounded-xl bg-surface border border-surface-border text-text-secondary hover:text-text-primary transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Open Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{openCount}</p>
          <p className="text-[10px] text-text-muted">Requires immediate attention</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Acknowledged</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{ackCount}</p>
          <p className="text-[10px] text-text-muted">Under active investigation</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
          <p className="text-[10px] text-text-muted">Successfully closed</p>
        </div>
      </div>

      {/* Incident Status Filter */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-surface border border-surface-border w-fit">
        {["all", "open", "acknowledged", "resolved"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              statusFilter === st
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {filteredIncidents.map((inc) => (
          <div
            key={inc.id}
            className={`p-4 rounded-2xl border transition-all ${
              inc.status === "open"
                ? "bg-rose-500/5 border-rose-500/30"
                : inc.status === "acknowledged"
                ? "bg-amber-500/5 border-amber-500/30"
                : "bg-surface border-surface-border opacity-75"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent">{inc.failureId}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.scope === "PLATFORM"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {inc.scope}
                  </span>
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Assigned: <strong>{inc.responsibleRole}</strong>
                  </span>
                </div>

                <p className="text-sm font-medium text-text-primary">{inc.description}</p>

                <div className="flex items-center gap-4 text-[11px] text-text-muted">
                  <span>ID: {inc.id}</span>
                  {inc.merchantId && <span>Branch: {inc.merchantId}</span>}
                </div>
              </div>

              {/* Status & Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                {inc.status === "open" && (
                  <button
                    onClick={() => updateIncidentStatus(inc.id, "acknowledged")}
                    disabled={updatingId === inc.id}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition-all border border-amber-500/30"
                  >
                    Acknowledge
                  </button>
                )}

                {inc.status !== "resolved" && (
                  <button
                    onClick={() => updateIncidentStatus(inc.id, "resolved")}
                    disabled={updatingId === inc.id}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-all border border-emerald-500/30"
                  >
                    Resolve Incident
                  </button>
                )}

                {inc.status === "resolved" && (
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredIncidents.length === 0 && !loading && (
          <div className="p-8 rounded-2xl bg-surface border border-surface-border text-center text-text-muted text-xs">
            No operational incidents recorded matching status "{statusFilter}".
          </div>
        )}
      </div>

      {/* Manual Simulation Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-surface border border-surface-border space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Raise Operational Incident
              </h3>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateIncident} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Failure Category</label>
                <select
                  value={simFailureId}
                  onChange={(e) => setSimFailureId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-background border border-surface-border text-xs text-text-primary outline-none"
                >
                  <option value="PAYMENT_PROCESSING_ERROR">PAYMENT_PROCESSING_ERROR (BRANCH)</option>
                  <option value="ORDER_PROCESSING_FAILED">ORDER_PROCESSING_FAILED (BRANCH)</option>
                  <option value="KITCHEN_WORKFLOW_DISRUPTED">KITCHEN_WORKFLOW_DISRUPTED (BRANCH)</option>
                  <option value="DELIVERY_ASSIGNMENT_FAILED">DELIVERY_ASSIGNMENT_FAILED (BRANCH)</option>
                  <option value="PLATFORM_SERVICE_OUTAGE">PLATFORM_SERVICE_OUTAGE (PLATFORM)</option>
                  <option value="DATABASE_CONNECTION_LOST">DATABASE_CONNECTION_LOST (PLATFORM)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Incident Description</label>
                <textarea
                  value={simDescription}
                  onChange={(e) => setSimDescription(e.target.value)}
                  placeholder="Describe the operational failure..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-background border border-surface-border text-xs text-text-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating || !simDescription.trim()}
                  className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
