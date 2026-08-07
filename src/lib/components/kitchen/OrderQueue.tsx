import { useEffect, useState, useCallback, useRef } from "react";
import { Order, OrderStatus } from "../../firestoreSchema";
import { subscribeToActiveOrders, transitionOrderStatus } from "../../api/kitchen";
import { useMerchant } from "../../contexts/MerchantContext";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../common/Toast";
import { Skeleton } from "../common/Skeleton";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { chimeManager } from "@/lib/audio/chimeManager";
import {
  AlertCircle,
  CookingPot,
  Package,
  WifiOff,
  Volume2,
  VolumeX,
  Filter,
  AlertTriangle,
} from "lucide-react";

const COLUMNS: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: "paid", label: "New Orders", icon: <AlertCircle className="w-4 h-4" /> },
  { key: "preparing", label: "Preparing", icon: <CookingPot className="w-4 h-4" /> },
  { key: "ready", label: "Ready", icon: <Package className="w-4 h-4" /> },
];

interface OrderQueueProps {
  isHighContrast?: boolean;
}

export function OrderQueue({ isHighContrast = false }: OrderQueueProps) {
  const { merchantId } = useMerchant();
  const { user } = useAuth();

  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  // Module C1 Refinements State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(true);
  const prevNewOrderCountRef = useRef<number>(0);

  useEffect(() => {
    setAudioUnlocked(chimeManager.getIsUnlocked());
  }, []);

  const handleUnlockAudio = () => {
    const success = chimeManager.unlockAudio();
    setAudioUnlocked(success);
    if (success) {
      chimeManager.playIncomingOrderChime(1);
      showToast("Audio alert chimes enabled!", "success");
    }
  };

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
      const newPaidCount = fetchedOrders.filter((o) => o.status === "paid").length;
      if (newPaidCount > prevNewOrderCountRef.current) {
        chimeManager.playIncomingOrderChime(3);
      }
      prevNewOrderCountRef.current = newPaidCount;
    });

    return () => unsub();
  }, [merchantId]);

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

  // Filter orders based on Quick Status Pills
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "delayed") {
      if (order.status !== "preparing") return false;
      const startTimeMs = (order.acceptedAt as any)?.toMillis
        ? (order.acceptedAt as any).toMillis()
        : (order.createdAt as any)?.toMillis
        ? (order.createdAt as any).toMillis()
        : Date.now();
      return Math.floor((Date.now() - startTimeMs) / (1000 * 60)) >= 15;
    }
    return order.status === statusFilter;
  });

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
      {/* Audio Unlock Banner */}
      {!audioUnlocked && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-amber-400" />
            <span>Audio alert chimes are muted by browser policy. Tap to enable alert sound.</span>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all"
          >
            <Volume2 className="w-3.5 h-3.5 inline mr-1" /> Enable Audio
          </button>
        </div>
      )}

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 font-semibold border border-red-200">
          <WifiOff className="w-5 h-5" />
          <span>You are offline. Reconnecting...</span>
        </div>
      )}

      {/* Quick Status Filter Pills (C1 Refinement) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
          <Filter className="w-3 h-3 text-accent" /> Filter:
        </span>

        {[
          { key: "all", label: `All (${orders.length})` },
          { key: "paid", label: `New (${orders.filter((o) => o.status === "paid").length})` },
          { key: "preparing", label: `Preparing (${orders.filter((o) => o.status === "preparing").length})` },
          { key: "ready", label: `Ready (${orders.filter((o) => o.status === "ready").length})` },
          {
            key: "delayed",
            label: `Delayed (${
              orders.filter((o) => {
                if (o.status !== "preparing") return false;
                const startMs = (o.acceptedAt as any)?.toMillis
                  ? (o.acceptedAt as any).toMillis()
                  : (o.createdAt as any)?.toMillis
                  ? (o.createdAt as any).toMillis()
                  : Date.now();
                return Math.floor((Date.now() - startMs) / (1000 * 60)) >= 15;
              }).length
            })`,
          },
        ].map((pill) => (
          <button
            key={pill.key}
            onClick={() => setStatusFilter(pill.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === pill.key
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "bg-surface border border-surface-border text-text-secondary hover:text-text-primary"
            } ${pill.key === "delayed" && statusFilter === "delayed" ? "bg-amber-500 text-black" : ""}`}
          >
            {pill.key === "delayed" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {pill.label}
          </button>
        ))}
      </div>

      {/* Kanban Columns */}
      <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none">
        {COLUMNS.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.status === col.key);

          return (
            <div
              key={col.key}
              className={`rounded-xl p-4 flex flex-col h-[calc(100vh-160px)] min-w-[85vw] md:min-w-0 snap-center flex-shrink-0 ${
                isHighContrast ? "bg-black border-2 border-yellow-400" : ""
              }`}
              style={{
                background: isHighContrast ? "#000000" : "var(--surface)",
                border: isHighContrast ? "2px solid #facc15" : "1px solid var(--border)",
              }}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between mb-4 pb-3 flex-shrink-0"
                style={{ borderBottom: isHighContrast ? "2px solid #facc15" : "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: col.key === "paid" ? "var(--error)" : "var(--primary)" }}>{col.icon}</span>
                  <h3 className={`font-bold ${isHighContrast ? "text-yellow-400 font-mono text-base" : ""}`}>
                    {col.label}
                  </h3>
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
                    isHighContrast={isHighContrast}
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

