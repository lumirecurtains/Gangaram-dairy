"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, Package, Search, Filter, Clock, MapPin, IndianRupee, Eye, ExternalLink, Bike } from "lucide-react";
import { Modal } from "@/lib/components/common/Modal";

interface OrderData {
  id: string;
  status: string;
  createdAt: { _seconds: number } | any;
  grandTotal: number;
  items: any[];
  deliveryAddress: any;
  riderId: string | null;
}

const STATUS_FILTERS = ["all", "pending_payment", "paid", "preparing", "ready", "out_for_delivery", "delivered", "cancelled", "payment_failed"];

export default function HotelOrdersPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();
  
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  const loadOrders = useCallback(async (isLoadMore = false) => {
    if (!user || !merchantId) return;
    
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const token = await user.getIdToken();
      let url = `/api/v1/hotel/orders?merchantId=${merchantId}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (isLoadMore && cursor) url += `&cursor=${cursor}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isLoadMore) {
        setOrders(prev => [...prev, ...data.orders]);
      } else {
        setOrders(data.orders);
      }
      setCursor(data.nextCursor);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, merchantId, statusFilter, cursor]);

  useEffect(() => {
    setCursor(null);
    loadOrders(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, user, merchantId]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Order History
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Review past transactions and fulfillment details.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)] overflow-x-auto">
          <Filter className="w-4 h-4 ml-2" style={{ color: "var(--text-secondary)" }} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm outline-none font-medium cursor-pointer pr-4"
          >
            {STATUS_FILTERS.map(s => (
              <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ").toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="font-medium text-lg">No orders found</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <th className="p-4 font-semibold text-sm">Order ID</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm">Items</th>
                  <th className="p-4 font-semibold text-sm">Grand Total</th>
                  <th className="p-4 font-semibold text-sm">Time</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const date = o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000) : new Date(o.createdAt);
                  return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-[var(--bg)] transition-colors" style={{ borderColor: "var(--border)" }}>
                    <td className="p-4 font-mono text-sm">#{o.id.slice(-8).toUpperCase()}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium">{o.items.length} items</td>
                    <td className="p-4 font-semibold text-sm">₹{o.grandTotal}</td>
                    <td className="p-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}<br/>
                      {date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(o)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {cursor && (
            <button 
              onClick={() => loadOrders(true)}
              disabled={loadingMore}
              className="w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : "Load More"}
            </button>
          )}
        </div>
      )}

      {selectedOrder && (
        <Modal isOpen={true} onClose={() => setSelectedOrder(null)} title={`Order #${selectedOrder.id.slice(-8).toUpperCase()}`}>
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
              <div>
                <p className="text-xs uppercase font-bold" style={{ color: "var(--text-secondary)" }}>Current Status</p>
                <p className="font-bold text-lg capitalize">{selectedOrder.status.replace(/_/g, " ")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase font-bold" style={{ color: "var(--text-secondary)" }}>Grand Total</p>
                <p className="font-bold text-lg text-[var(--accent)] flex items-center justify-end"><IndianRupee className="w-4 h-4"/>{selectedOrder.grandTotal}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase font-bold mb-2" style={{ color: "var(--text-secondary)" }}>Order Items</p>
              <div className="space-y-2 p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="font-medium">{item.qty}x {item.name}</span>
                    <span style={{ color: "var(--text-secondary)" }}>₹{item.ourPrice * item.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase font-bold mb-2" style={{ color: "var(--text-secondary)" }}>Fulfillment Details</p>
              <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
                  <span>{selectedOrder.deliveryAddress.flat}, {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.city}</span>
                </div>
                {selectedOrder.riderId && (
                  <div className="flex items-start gap-2 text-sm pt-2 border-t border-[var(--border)]">
                    <Bike className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
                    <span className="font-medium">Assigned Rider ID: <span className="font-mono text-xs font-normal text-gray-500">{selectedOrder.riderId}</span></span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-2">
              <a 
                href={`/order/${selectedOrder.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-all hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                View Live Public Tracker <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
