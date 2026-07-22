"use client";

import { IndianRupee, Clock, Loader2, ChevronRight } from "lucide-react";
import { Order, OrderStatus } from "../../firestoreSchema";

interface KitchenOrderCardProps {
  order: Order & { id: string };
  statusColumn: OrderStatus;
  isTransitioning: boolean;
  onTransition: (orderId: string, currentStatus: OrderStatus, nextStatus: OrderStatus) => void;
}

export function KitchenOrderCard({ order, statusColumn, isTransitioning, onTransition }: KitchenOrderCardProps) {
  const showAccept = statusColumn === "paid";
  const showMarkReady = statusColumn === "preparing";
  const nextStatus: OrderStatus | null = showAccept ? "preparing" : showMarkReady ? "ready" : null;

  return (
    <div
      className={`rounded-xl p-3 transition-all duration-200 ${
        showAccept ? "border-2" : ""
      }`}
      style={{
        background: "var(--bg)",
        borderColor: showAccept ? "var(--error)" : "var(--border)",
        borderStyle: "solid",
        opacity: isTransitioning ? 0.6 : 1,
      }}
    >
      {/* Order header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-sm">
            #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <span
          className="font-bold flex items-center text-sm"
          style={{ color: "var(--accent)" }}
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
            className="text-xs font-semibold"
            style={{ color: "var(--text)" }}
          >
            {item.qty}x {item.name}
          </p>
        ))}
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
        <Clock className="w-3 h-3" />
        <span>
          {(order.createdAt as any)?.toDate?.()?.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Action button */}
      {nextStatus && (
        <button
          onClick={() => onTransition(order.id, statusColumn, nextStatus)}
          disabled={isTransitioning}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          style={{
            background: showAccept ? "var(--primary)" : "var(--accent)",
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
