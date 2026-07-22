"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Loader2, Store, AlertCircle } from "lucide-react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, limit, getDocs, orderBy, startAfter } from "firebase/firestore";
import { showToast } from "@/lib/components/common/Toast";
import { useAuth } from "@/lib/contexts";

export default function AdminMerchantsPage() {
  const { user } = useAuth();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const db = getFirebaseFirestore();
        // Pagination logic: start with first 50 merchants
        const q = query(
          collection(db, "merchants"),
          limit(50)
        );
        const snap = await getDocs(q);
        setMerchants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err: any) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStatusChange = async (merchantId: string, action: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/merchants/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ merchantId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMerchants(merchants.map(m => m.id === merchantId ? { ...m, onboardingStatus: data.currentStatus } : m));
      showToast(`Merchant ${action} successful`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Store className="w-6 h-6" style={{ color: "var(--primary)" }} />
          Merchant Management
        </h1>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <th className="p-4 font-semibold text-sm">Merchant ID</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <td className="p-4 font-mono text-sm">{m.id}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.onboardingStatus === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.onboardingStatus}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2">
                      {m.onboardingStatus !== "LIVE" && (
                        <button onClick={() => handleStatusChange(m.id, "activate")} className="px-3 py-1 bg-green-500 text-white rounded text-xs font-bold">Activate</button>
                      )}
                      {m.onboardingStatus !== "SUSPENDED" && (
                        <button onClick={() => handleStatusChange(m.id, "suspend")} className="px-3 py-1 bg-red-500 text-white rounded text-xs font-bold">Suspend</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
