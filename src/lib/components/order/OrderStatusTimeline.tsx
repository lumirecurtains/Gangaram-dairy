"use client";

import { CheckCircle, Circle, Clock, CookingPot, Bike, Package, Home, XCircle, AlertCircle } from "lucide-react";

interface OrderStatusTimelineProps {
  status: string;
}

const steps = [
  { key: "paid", label: "Payment Confirmed", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: CookingPot },
  { key: "ready", label: "Ready for Pickup", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Bike },
  { key: "delivered", label: "Delivered", icon: Home },
];

const statusOrder = [
  "pending_payment",
  "payment_failed",
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
];

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const currentIndex = statusOrder.indexOf(status);

  // --- Pending payment ---
  if (status === "pending_payment") {
    return (
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="relative">
          <Clock className="w-6 h-6" style={{ color: "var(--warning)" }} />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-pulse-dot" />
        </div>
        <div>
          <p className="font-semibold">Awaiting Payment</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Your order is waiting for payment confirmation</p>
        </div>
      </div>
    );
  }

  // --- Payment failed ---
  if (status === "payment_failed") {
    return (
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--error-light)" }}>
          <AlertCircle className="w-5 h-5" style={{ color: "var(--error)" }} />
        </div>
        <div>
          <p className="font-semibold" style={{ color: "var(--error)" }}>Payment Failed</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Your payment did not go through. Please try again.</p>
        </div>
      </div>
    );
  }

  // --- Cancelled ---
  if (status === "cancelled") {
    return (
      <div className="text-center py-4 animate-fade-in">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--error-light)" }}>
          <XCircle className="w-6 h-6" style={{ color: "var(--error)" }} />
        </div>
        <p className="font-bold text-lg" style={{ color: "var(--error)" }}>Order Cancelled</p>
      </div>
    );
  }

  // --- Refunded ---
  if (status === "refunded") {
    return (
      <div className="text-center py-4 animate-fade-in">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent-light)" }}>
          <CheckCircle className="w-6 h-6" style={{ color: "var(--accent)" }} />
        </div>
        <p className="font-bold text-lg" style={{ color: "var(--accent)" }}>Refunded</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Your refund has been processed.</p>
      </div>
    );
  }

  // --- Loading state (no status matched any known state) ---
  if (currentIndex === -1) {
    return null;
  }

  return (
    <div className="space-y-0" role="list" aria-label="Order progress">
      {steps.map((step, i) => {
        const isCompleted = currentIndex > statusOrder.indexOf(step.key) || status === step.key;
        const isCurrent = status === step.key;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex gap-3 animate-fade-in" role="listitem">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? "text-white" : ""
                } ${isCurrent ? "animate-pulse-dot" : ""}`}
                style={{
                  background: isCompleted ? "var(--accent)" : "var(--bg)",
                  border: isCurrent
                    ? `3px solid var(--accent)`
                    : isCompleted
                    ? "2px solid var(--accent)"
                    : `2px solid var(--border)`,
                  transition: "background 300ms ease, border 300ms ease",
                }}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Circle className="w-4 h-4" style={{ color: "var(--border)" }} />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="w-0.5 h-8 transition-all duration-500"
                  style={{ background: isCompleted ? "var(--accent)" : "var(--border)" }}
                />
              )}
            </div>

            {/* Label */}
            <div className={`pb-6`}>
              <p
                className={`text-sm font-medium transition-all duration-300 ${
                  isCompleted ? "" : "opacity-50"
                } ${isCurrent ? "font-bold" : ""}`}
                style={{
                  color: isCurrent ? "var(--accent)" : "var(--text)",
                }}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
