"use client";

import { CheckCircle, Circle, Clock, CookingPot, Bike, Package, Home } from "lucide-react";

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
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const currentIndex = statusOrder.indexOf(status);

  if (status === "pending_payment") {
    return (
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6" style={{ color: "var(--warning)" }} />
        <div>
          <p className="font-semibold">Awaiting Payment</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Your order is waiting for payment confirmation</p>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="text-center py-4">
        <p className="font-bold text-lg" style={{ color: "var(--error)" }}>Order Cancelled</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isCompleted = currentIndex > statusOrder.indexOf(step.key) || status === step.key;
        const isCurrent = status === step.key;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCompleted ? "text-white" : ""
                }`}
                style={{
                  background: isCompleted ? "var(--accent)" : "var(--bg)",
                  border: isCurrent ? `3px solid var(--accent)` : `2px solid var(--border)`,
                }}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Circle className="w-4 h-4" style={{ color: "var(--border)" }} />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="w-0.5 h-8"
                  style={{ background: isCompleted ? "var(--accent)" : "var(--border)" }}
                />
              )}
            </div>

            {/* Label */}
            <div className={`pb-6 ${isCurrent ? "" : ""}`}>
              <p
                className={`text-sm font-medium ${
                  isCompleted ? "" : "opacity-50"
                }`}
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
