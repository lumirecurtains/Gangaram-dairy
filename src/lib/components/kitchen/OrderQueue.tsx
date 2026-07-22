"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Order, OrderStatus } from "../../firestoreSchema";
import { subscribeToActiveOrders, transitionOrderStatus } from "../../api/kitchen";
import { useMerchant } from "../../contexts/MerchantContext";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../common/Toast";
import { Skeleton } from "../common/Skeleton";
import { KitchenOrderCard } from "./KitchenOrderCard";
import {
  AlertCircle,
  CookingPot,
  Package,
  WifiOff
} from "lucide-react";

const COLUMNS: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: "paid", label: "New Orders", icon: <AlertCircle className="w-4 h-4" /> },
  { key: "preparing", label: "Preparing", icon: <CookingPot className="w-4 h-4" /> },
  { key: "ready", label: "Ready", icon: <Package className="w-4 h-4" /> },
];

export function OrderQueue() {
  const { merchantId } = useMerchant();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  
  // Audio context for alerts
  const audioContextRef = useRef<AudioContext | null>(null);
  const prevNewOrderCountRef = useRef<number>(0);

  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio not available — silently degrade
    }
  }, []);

  useEffect(() => {
    if (!merchantId) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToActiveOrders(merchantId, (fetchedOrders, offlineState) => {
      setOrders(fetchedOrders);
      setIsOffline(offlineState);
      setLoading(false);

      // Sound alert if new "paid" orders length increases
      const newPaidCount = fetchedOrders.filter(o => o.status === "paid").length;
      if (newPaidCount > prevNewOrderCountRef.current) {
        playAlertSound();
      }
      prevNewOrderCountRef.current = newPaidCount;
    });

    return () => unsub();
  }, [merchantId, playAlertSound]);

  const handleTransition = useCallback(
    async (orderId: string, currentStatus: OrderStatus, newStatus: OrderStatus) => {
      if (!user?.uid) {
        showToast("You must be logged in.", "error");
        return;
      }
      setTransitioningId(orderId);
      try {
        await transitionOrderStatus(orderId, currentStatus, newStatus, user.uid);
        showToast(`Order marked as ${newStatus}`, "success");
      } catch (err: any) {
        showToast(err.message || "Failed to update order", "error");
      } finally {
        setTransitioningId(null);
      }
    },
    [user?.uid]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Skeleton className="w-1/2 h-6 rounded mb-4" />
            <Skeleton className="w-full h-32 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isOffline && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 font-semibold border border-red-200">
          <WifiOff className="w-5 h-5" />
          <span>You are offline. Reconnecting...</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          
          return (
            <div
              key={col.key}
              className="rounded-xl p-4 flex flex-col h-[calc(100vh-140px)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-4 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: col.key === "paid" ? "var(--error)" : "var(--primary)" }}>{col.icon}</span>
                  <h3 className="font-bold">{col.label}</h3>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: col.key === "paid" ? "rgba(244,67,54,0.15)" : "var(--bg)",
                    color: col.key === "paid" ? "var(--error)" : "var(--text-secondary)",
                  }}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Empty state */}
              {colOrders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No orders
                  </p>
                </div>
              )}

              {/* Order cards */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {colOrders.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    statusColumn={col.key}
                    isTransitioning={transitioningId === order.id}
                    onTransition={handleTransition}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
