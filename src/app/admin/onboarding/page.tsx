"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";

interface Merchant {
  id: string;
  name?: string;
  ownerUid: string;
  onboardingStatus: string;
  fssaiNumber?: string;
  gstNumber?: string;
  createdAt: any;
}

export default function AdminOnboardingPage() {
  const { user, claims } = useAuth();
  const router = useRouter();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionDialog, setRejectionDialog] = useState<{
    open: boolean;
    merchantId: string | null;
    reason: string;
  }>({ open: false, merchantId: null, reason: "" });

  useEffect(() => {
    if (!user) return;
    if (!(claims as any)?.isSuperAdmin) {
      showToast("Access denied: Super Admin required", "error");
      router.push("/");
      return;
    }

    loadPendingMerchants();
  }, [user, claims, router]);

  const loadPendingMerchants = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/onboarding", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMerchants(data.merchants);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (merchantId: string) => {
    setProcessing(merchantId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ merchantId, action: "approve" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Merchant approved successfully", "success");
      setMerchants((prev) =>
        prev.filter((m) => m.id !== merchantId)
      );
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionDialog.merchantId) return;
    if (!rejectionDialog.reason.trim()) {
      showToast("Rejection reason is required", "error");
      return;
    }

    setProcessing(rejectionDialog.merchantId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId: rejectionDialog.merchantId,
          action: "reject",
          rejectionReason: rejectionDialog.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Merchant rejected", "success");
      setMerchants((prev) =>
        prev.filter((m) => m.id !== rejectionDialog.merchantId)
      );
      setRejectionDialog({ open: false, merchantId: null, reason: "" });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Merchant Onboarding Review</h1>

      {merchants.length === 0 ? (
        <div className="text-center py-12 p-6 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="font-medium">No pending applications</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>All merchants have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {merchants.map((merchant) => (
            <div
              key={merchant.id}
              className="p-6 rounded-2xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{merchant.name || "Unnamed Merchant"}</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>ID: {merchant.id}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Owner: {merchant.ownerUid}</p>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>FSSAI Number</p>
                      <p className="text-sm">{merchant.fssaiNumber || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>GST Number</p>
                      <p className="text-sm">{merchant.gstNumber || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(merchant.id)}
                    disabled={processing === merchant.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    style={{ background: "var(--accent)" }}
                  >
                    {processing === merchant.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectionDialog({ open: true, merchantId: merchant.id, reason: "" })}
                    disabled={processing === merchant.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ borderColor: "var(--error)", color: "var(--error)" }}
                  >
                    {processing === merchant.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Dialog */}
      {rejectionDialog.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: "var(--surface)" }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6" style={{ color: "var(--error)" }} />
              <h3 className="text-lg font-bold">Reject Application</h3>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Provide a reason for rejection. The merchant will see this message.
            </p>

            <textarea
              value={rejectionDialog.reason}
              onChange={(e) => setRejectionDialog({ ...rejectionDialog, reason: e.target.value })}
              placeholder="E.g., FSSAI number format invalid..."
              className="w-full p-3 rounded-lg border text-sm outline-none focus:border-[var(--primary)] mb-4"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              rows={4}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectionDialog({ open: false, merchantId: null, reason: "" })}
                className="px-4 py-2 rounded-lg font-medium border"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ background: "var(--error)" }}
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
