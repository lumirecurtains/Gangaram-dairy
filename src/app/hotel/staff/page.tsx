"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, Users, Shield, Phone, ShieldAlert, Trash2, Plus } from "lucide-react";
import { Modal } from "@/lib/components/common/Modal";

interface StaffMember {
  uid: string;
  role: string;
  phone: string;
  grantedAt: { _seconds: number } | any;
}

export default function HotelStaffPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetUid, setTargetUid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!user || !merchantId) return;
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/hotel/staff?merchantId=${merchantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStaff(data.staff);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, merchantId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleAction = async (action: "assign_staff" | "revoke_staff", uid: string) => {
    if (!uid.trim()) return showToast("User ID is required", "error");
    
    if (action === "revoke_staff") {
      if (!confirm("Are you sure you want to revoke kitchen access for this user?")) return;
    }

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/hotel/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUid: uid.trim(), action, merchantId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Staff access ${action === "assign_staff" ? "granted" : "revoked"} successfully`, "success");
      setIsModalOpen(false);
      setTargetUid("");
      loadStaff();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  const kitchenStaff = staff.filter(s => s.role === "merchant_staff");
  const riders = staff.filter(s => s.role === "rider");

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto w-full pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Staff Directory
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage kitchen access and view assigned riders for your branch.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-5 h-5" /> Add Kitchen Staff
        </button>
      </div>

      <div className="space-y-8">
        
        {/* Kitchen Staff Section */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Kitchen Staff
          </h2>
          
          {kitchenStaff.length === 0 ? (
            <div className="text-center py-12 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No kitchen staff assigned yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kitchenStaff.map((member) => (
                <div key={member.uid} className="flex items-center justify-between p-4 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="font-bold">{member.phone}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(0,200,83,0.1)", color: "var(--accent)" }}>
                        Kitchen
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-500">UID: {member.uid}</p>
                  </div>
                  <button 
                    onClick={() => handleAction("revoke_staff", member.uid)}
                    disabled={submitting}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                    title="Revoke Access"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dedicated Riders Section */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-500" />
            Dedicated Riders (Visibility Only)
          </h2>
          
          {riders.length === 0 ? (
            <div className="text-center py-12 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No dedicated riders assigned to this branch.</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Rider assignment is managed globally by Super Admins.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riders.map((member) => (
                <div key={member.uid} className="flex flex-col p-4 rounded-xl border bg-[var(--surface)] border-[var(--border)] opacity-80">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="font-bold">{member.phone}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                      Rider
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-500">UID: {member.uid}</p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title="Assign Kitchen Staff">
          <div className="space-y-4">
            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm border border-blue-200">
              User must first sign up via the app using their phone number to generate a UID.
            </div>
            
            <div>
              <label className="block text-xs font-semibold mb-1">Target User UID *</label>
              <input 
                type="text" 
                required 
                value={targetUid} 
                onChange={e => setTargetUid(e.target.value.trim())} 
                placeholder="e.g. zTx9Pq..."
                className="w-full p-3 rounded-lg border text-sm outline-none font-mono" 
                style={{ background: "var(--bg)", borderColor: "var(--border)" }} 
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-gray-50 border"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction("assign_staff", targetUid)}
                disabled={submitting || !targetUid}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "var(--primary)" }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant Access"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
