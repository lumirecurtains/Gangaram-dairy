"use client";

import { IndianRupee } from "lucide-react";

interface PaymentSummaryProps {
  subTotal: number;
  deliveryFee: number;
  grandTotal: number;
  discount?: number;
}

export function PaymentSummary({
  subTotal,
  deliveryFee,
  discount = 0,
  grandTotal,
}: PaymentSummaryProps) {
  return (
    <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold border-b pb-2 mb-2" style={{ borderColor: "var(--border)" }}>Bill Details</h3>
      
      <div className="flex justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>Item Total</span>
        <span className="font-medium flex items-center"><IndianRupee className="w-3 h-3"/>{subTotal}</span>
      </div>

      {discount > 0 && (
        <div className="flex justify-between text-sm text-green-600 font-bold">
          <span>Item Discount</span>
          <span className="flex items-center">-<IndianRupee className="w-3 h-3"/>{discount}</span>
        </div>
      )}
      
      <div className="flex justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>Delivery Partner Fee</span>
        <span className="font-medium flex items-center"><IndianRupee className="w-3 h-3"/>{deliveryFee}</span>
      </div>
      
      <div className="flex justify-between font-bold text-lg pt-3 border-t mt-2" style={{ borderColor: "var(--border)" }}>
        <span>To Pay</span>
        <span className="flex items-center" style={{ color: "var(--accent)" }}><IndianRupee className="w-4 h-4"/>{grandTotal}</span>
      </div>
    </div>
  );
}
