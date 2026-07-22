"use client";

import { useState } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Loader2, Shield, Search, Check, AlertCircle } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";
import { useAuth } from "@/lib/contexts";

export default function AdminRolesPage() {
  const { user } = useAuth();
  const [targetUid, setTargetUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [roleResult, setRoleResult] = useState<any>(null);

  const handleAction = async (action: string, role?: string, merchantId?: string) => {
    if (!targetUid.trim()) {
      showToast("Please enter a target UID", "error");
      return;
    }

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: targetUid.trim(), action, role, merchantId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      showToast(`Successfully executed ${action}`, "success");
      setRoleResult(data);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6" style={{ color: "var(--primary)" }} />
          Role Management
        </h1>

        <div className="p-6 rounded-xl mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <label className="block text-sm font-semibold mb-2">Target User UID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value)}
              placeholder="e.g. zTx9Pq..."
              className="flex-1 p-3 rounded-lg border outline-none focus:border-[var(--primary)]"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
            *Phone/Email lookup must be done via Firebase Console for security until the User Directory API is built.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <h3 className="font-bold mb-4 border-b pb-2">Rider Controls</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("assign_rider")}
                disabled={loading}
                className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition-all"
              >
                Grant Rider
              </button>
              <button
                onClick={() => handleAction("revoke_rider")}
                disabled={loading}
                className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-all"
              >
                Revoke Rider
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <h3 className="font-bold mb-4 border-b pb-2">Admin Controls</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("grant", "super_admin")}
                disabled={loading}
                className="flex-1 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-all"
              >
                Grant Admin
              </button>
              <button
                onClick={() => handleAction("demote")}
                disabled={loading}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Revoke Admin
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
