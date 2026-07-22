"use client";

import { useCart } from "@/lib/contexts";
import { ShoppingCart, X, IndianRupee } from "lucide-react";
import Link from "next/link";
import { CartItemRow } from "./CartItem";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, merchantName, subTotal, clearCart } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-sm h-full overflow-y-auto animate-slide-in"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 glass">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="font-bold">Cart ({items.length})</h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button onClick={clearCart} className="text-xs font-medium px-2 py-1 rounded-lg" style={{ color: "var(--error)" }}>
                Clear
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:opacity-80">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="px-4">
          {merchantName && (
            <p className="text-sm font-medium py-3" style={{ color: "var(--text-secondary)" }}>
              From: <span className="font-semibold" style={{ color: "var(--text)" }}>{merchantName}</span>
            </p>
          )}

          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Add items from a restaurant</p>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartItemRow key={item.itemId} {...item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="sticky bottom-0 p-4 glass border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold">Subtotal</span>
              <span className="font-bold text-lg flex items-center">
                <IndianRupee className="w-4 h-4" />{subTotal}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full text-center py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-[1.02]"
              style={{ background: "var(--primary)" }}
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
