"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Loader2, Bike } from "lucide-react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, limit, getDocs, orderBy, startAfter } from "firebase/firestore";
import { showToast } from "@/lib/components/common/Toast";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  async function loadOrders(cursor: any = null) {
    try {
      const db = getFirebaseFirestore();
      let q = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      if (cursor) {
        q = query(collection(db, "orders"), orderBy("createdAt", "desc"), startAfter(cursor), limit(50));
      }
      
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      if (cursor) {
        setOrders(prev => [...prev, ...docs]);
      } else {
        setOrders(docs);
      }
      
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bike className="w-6 h-6" style={{ color: "var(--primary)" }} />
          Global Order Oversight
        </h1>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border mb-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <th className="p-4 font-semibold text-sm">Order ID</th>
                    <th className="p-4 font-semibold text-sm">Status</th>
                    <th className="p-4 font-semibold text-sm">Grand Total</th>
                    <th className="p-4 font-semibold text-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                      <td className="p-4 font-mono text-sm">{o.id.slice(-8)}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-sm">₹{o.grandTotal}</td>
                      <td className="p-4 text-xs text-gray-500">
                        {o.createdAt?.toDate?.()?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {orders.length >= 50 && (
              <button 
                onClick={() => loadOrders(lastDoc)}
                className="w-full py-3 rounded-lg font-bold transition-all hover:bg-gray-100 border border-gray-200"
              >
                Load More Orders
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}
