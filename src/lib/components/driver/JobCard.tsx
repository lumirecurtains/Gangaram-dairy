"use client";

import { IndianRupee, MapPin, Clock, Bike, ChevronRight, Loader2 } from "lucide-react";

interface JobCardOrderItem {
  name: string;
  qty: number;
}

interface JobCardProps {
  orderId: string;
  status: string;
  items: JobCardOrderItem[];
  grandTotal: number;
  deliveryAddress: { flat: string; street: string; city: string };
  deliveryFee: number;
  createdAt: { toDate?: () => Date };
  riderId: string | null;
  currentUserId: string;
  isMyJob: boolean;
  onAccept?: () => void;
  onMarkDelivered?: () => void;
  onViewInvoice?: () => void;
  isTransitioning: boolean;
}

export function JobCard({
  orderId,
  status,
  items,
  grandTotal,
  deliveryAddress,
  deliveryFee,
  createdAt,
  riderId,
  currentUserId,
  isMyJob,
  onAccept,
  onMarkDelivered,
  onViewInvoice,
  isTransitioning,
}: JobCardProps) {
  const isAvailable = status === "ready" && !riderId;
  const isMyDelivery = status === "out_for_delivery" && riderId === currentUserId;
  const isCompleted = status === "delivered" && riderId === currentUserId;

  return (
    <div
      className={`rounded-xl p-4 transition-all duration-200 ${
        isMyDelivery ? "border-2" : ""
      } ${isAvailable ? "hover:-translate-y-0.5 hover:shadow-md" : ""}`}
      style={{
        background: "var(--surface)",
        borderColor: isMyDelivery ? "var(--primary)" : "var(--border)",
        opacity: isCompleted ? 0.7 : 1,
      }}
    >
      {/* Order header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5" style={{ color: "var(--primary)" }} />
          <div>
            <p className="font-bold text-base">
              #{orderId.slice(-8).toUpperCase()}
            </p>
            {createdAt?.toDate && (
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                <Clock className="w-3 h-3 inline mr-0.5" />
                {createdAt.toDate().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
        <span className="font-bold text-lg flex items-center" style={{ color: "var(--accent)" }}>
          <IndianRupee className="w-4 h-4" />
          {grandTotal}
        </span>
      </div>

      {/* Items summary */}
      <div className="space-y-0.5 mb-3">
        {items.slice(0, 3).map((item, idx) => (
          <p key={idx} className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {item.name} &times; {item.qty}
          </p>
        ))}
        {items.length > 3 && (
          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            +{items.length - 3} more items
          </p>
        )}
      </div>

      {/* Delivery address */}
      {deliveryAddress && (
        <div className="flex items-start gap-1.5 text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {deliveryAddress.flat}, {deliveryAddress.street}, {deliveryAddress.city}
          </span>
        </div>
      )}

      {/* Delivery fee display */}
      {deliveryFee > 0 && (
        <div className="flex items-center justify-between text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: "var(--bg)" }}>
          <span style={{ color: "var(--text-secondary)" }}>Delivery Fee</span>
          <span className="font-semibold flex items-center">
            <IndianRupee className="w-3 h-3" />
            {deliveryFee}
          </span>
        </div>
      )}

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: isCompleted
              ? "rgba(0,200,83,0.15)"
              : isMyDelivery
              ? "rgba(255,87,34,0.15)"
              : isAvailable
              ? "rgba(255,179,0,0.15)"
              : "var(--bg)",
            color: isCompleted
              ? "var(--accent)"
              : isMyDelivery
              ? "var(--primary)"
              : isAvailable
              ? "var(--warning)"
              : "var(--text-secondary)",
          }}
        >
          {isCompleted ? "Delivered" : isMyDelivery ? "In Transit" : isAvailable ? "Available" : "Assigned"}
        </span>
        {isMyJob && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
            My Job
          </span>
        )}
      </div>

      {/* Action buttons */}
      {isAvailable && onAccept && (
        <button
          onClick={onAccept}
          disabled={isTransitioning}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {isTransitioning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Accepting...</>
          ) : (
            <><Bike className="w-4 h-4" /> Accept Delivery <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      )}

      {isMyDelivery && onMarkDelivered && (
        <button
          onClick={onMarkDelivered}
          disabled={isTransitioning}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          style={{ background: "var(--primary)" }}
        >
          {isTransitioning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
          ) : (
            <><ChevronRight className="w-4 h-4" /> Mark Delivered</>
          )}
        </button>
      )}

      {isCompleted && onViewInvoice && (
        <button
          onClick={onViewInvoice}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-[1.02]"
          style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          View Invoice
        </button>
      )}
    </div>
  );
}
