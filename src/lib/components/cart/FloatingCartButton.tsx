"use client";

import { useCart } from "@/lib/contexts";
import { ShoppingCart, IndianRupee } from "lucide-react";

export function FloatingCartButton() {
  const { itemCount, subTotal, openCartDrawer } = useCart();

  if (itemCount === 0) return null;

  return (
    <button
      onClick={openCartDrawer}
      className="fixed bottom-20 md:bottom-8 right-4 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white shadow-lg transition-all hover:scale-105 animate-bounce-in"
      style={{ background: "var(--primary)" }}
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-[10px] flex items-center justify-center bg-white font-bold" style={{ color: "var(--primary)" }}>
          {itemCount}
        </span>
      </div>
      <span className="font-semibold flex items-center">
        <IndianRupee className="w-3.5 h-3.5" />{subTotal}
      </span>
    </button>
  );
}
