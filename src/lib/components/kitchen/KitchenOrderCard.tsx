import { IndianRupee, Clock, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { Order, OrderStatus } from "../../firestoreSchema";

interface KitchenOrderCardProps {
  order: Order & { id: string };
  statusColumn: OrderStatus;
  isTransitioning: boolean;
  isHighContrast?: boolean;
  onTransition: (orderId: string, currentStatus: OrderStatus, nextStatus: OrderStatus) => void;
}

export function KitchenOrderCard({
  order,
  statusColumn,
  isTransitioning,
  isHighContrast = false,
  onTransition,
}: KitchenOrderCardProps) {
  const showAccept = statusColumn === "paid";
  const showMarkReady = statusColumn === "preparing";
  const nextStatus: OrderStatus | null = showAccept ? "preparing" : showMarkReady ? "ready" : null;

  // Calculate prep delay in minutes
  const startTimeMs = (order.acceptedAt as any)?.toMillis
    ? (order.acceptedAt as any).toMillis()
    : (order.createdAt as any)?.toMillis
    ? (order.createdAt as any).toMillis()
    : Date.now();
  const elapsedMinutes = Math.floor((Date.now() - startTimeMs) / (1000 * 60));

  const isCriticalDelay = statusColumn === "preparing" && elapsedMinutes >= 25;
  const isAmberDelay = statusColumn === "preparing" && elapsedMinutes >= 15 && elapsedMinutes < 25;

  const cardBorderColor = isHighContrast
    ? "var(--accent)"
    : isCriticalDelay
    ? "rgba(244, 67, 54, 0.9)"
    : isAmberDelay
    ? "rgba(255, 152, 0, 0.9)"
    : showAccept
    ? "var(--error)"
    : "var(--border)";

  const cardBg = isHighContrast
    ? "#000000"
    : isCriticalDelay
    ? "rgba(244, 67, 54, 0.08)"
    : isAmberDelay
    ? "rgba(255, 152, 0, 0.08)"
    : "var(--bg)";

  return (
    <div
      className={`rounded-xl p-3 transition-all duration-200 border-2 ${
        isCriticalDelay ? "animate-pulse" : ""
      }`}
      style={{
        background: cardBg,
        borderColor: cardBorderColor,
        borderStyle: "solid",
        opacity: isTransitioning ? 0.6 : 1,
      }}
    >
      {/* Order header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className={`font-bold text-sm ${isHighContrast ? "text-yellow-400 font-mono text-base" : ""}`}>
            #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <span
          className={`font-bold flex items-center text-sm ${isHighContrast ? "text-white text-base" : ""}`}
          style={{ color: isHighContrast ? "#ffffff" : "var(--accent)" }}
        >
          <IndianRupee className="w-3 h-3" />
          {order.grandTotal}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-0.5 mb-2">
        {order.items.map((item, idx) => (
          <p
            key={idx}
            className={`text-xs font-semibold ${isHighContrast ? "text-white text-sm" : ""}`}
            style={{ color: isHighContrast ? "#ffffff" : "var(--text)" }}
          >
            {item.qty}x {item.name}
          </p>
        ))}
      </div>

      {/* Timestamp & Delay Badges */}
      <div className="flex items-center justify-between gap-1 text-xs mb-3">
        <div className="flex items-center gap-1" style={{ color: isHighContrast ? "#cbd5e1" : "var(--text-secondary)" }}>
          <Clock className="w-3 h-3" />
          <span>
            {(order.createdAt as any)?.toDate?.()?.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Preparation Delay Badges */}
        {isCriticalDelay && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500 text-white uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3" /> 25m+ CRITICAL DELAY
          </span>
        )}

        {isAmberDelay && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
            <Clock className="w-3 h-3" /> 15m+ Delayed
          </span>
        )}
      </div>

      {/* Action button */}
      {nextStatus && (
        <button
          onClick={() => onTransition(order.id, statusColumn, nextStatus)}
          disabled={isTransitioning}
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 ${
            isHighContrast ? "bg-yellow-400 text-black font-extrabold" : ""
          }`}
          style={{
            background: isHighContrast
              ? "#facc15"
              : showAccept
              ? "var(--primary)"
              : "var(--accent)",
            color: isHighContrast ? "#000000" : "#ffffff",
          }}
        >
          {isTransitioning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {showAccept ? "Accepting..." : "Marking..."}
            </>
          ) : (
            <>
              {showAccept ? "Accept Order" : "Mark Ready"}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
