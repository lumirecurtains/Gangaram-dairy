"use client";

import { IndianRupee } from "lucide-react";

interface PaymentSummaryProps {
  subTotal: number;
  deliveryFee: number;
  grandTotal: number;
  discount?: number;
}

export function PaymentSummary({ subTotal, deliveryFee, grandTotal, discount = 0 }: PaymentSummaryProps) {
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold mb-2">Payment Summary</h3>
      <div className="flex justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>Item Total</span>
        <span><IndianRupee className="w-3 h-3 inline" />{subTotal}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>Delivery Fee</span>
        <span><IndianRupee className="w-3 h-3 inline" />{deliveryFee}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm" style={{ color: "var(--accent)" }}>
          <span>Discount</span>
          <span>-<IndianRupee className="w-3 h-3 inline" />{discount}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-lg pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <span>Total</span>
        <span><IndianRupee className="w-4 h-4 inline" />{grandTotal}</span>
      </div>
    </div>
  );
}
