"use client";
export const dynamic = "force-dynamic";

import { useAuth, useCart } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { CartItemRow } from "@/lib/components/cart/CartItem";
import Link from "next/link";
import { ShoppingCart, IndianRupee, ArrowLeft, Trash2 } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";

export default function CartPage() {
  const { user } = useAuth();
  const { items, merchantName, subTotal, clearCart } = useCart();

  const deliveryFee = items.length > 0 ? 30 : 0;
  const grandTotal = subTotal + deliveryFee;

  const handleClearCart = () => {
    if (items.length === 0) return;
    // Clear cart with confirmation via toast acting as undo (Section 12 item 70 recommends undo over dialog)
    clearCart();
    showToast("Cart cleared", "success");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:opacity-80 active:scale-[0.98]" style={{ color: "var(--text-secondary)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold heading-tight">Your Cart</h1>
          </div>
          {items.length > 0 && (
            <button onClick={handleClearCart} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ color: "var(--error)", background: "rgba(244,67,54,0.1)" }}>
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2 heading-tight">Your cart is empty</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Looks like you haven&apos;t added anything yet</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 active:scale-[0.98]"
              style={{ background: "var(--primary)" }}
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <>
            {/* Merchant Info */}
            {merchantName && (
              <div className="p-3 rounded-xl mb-4 text-sm font-medium" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                From: <span className="font-semibold">{merchantName}</span>
              </div>
            )}

            {/* Cart Items */}
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {items.map((item) => (
                <CartItemRow key={item.itemId} {...item} />
              ))}
            </div>

            {/* Bill Summary */}
            <div className="rounded-xl p-4 mt-4 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold mb-3">Bill Summary</h3>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Item Total</span>
                <span className="font-medium flex items-center tabular-nums"><IndianRupee className="w-3.5 h-3.5" />{subTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Delivery Fee</span>
                <span className="font-medium flex items-center tabular-nums"><IndianRupee className="w-3.5 h-3.5" />{deliveryFee}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 tabular-nums" style={{ borderTop: "1px solid var(--border)" }}>
                <span>Grand Total</span>
                <span className="flex items-center"><IndianRupee className="w-4 h-4" />{grandTotal}</span>
              </div>
            </div>

            {/* Savings */}
            {items.some((i) => i.aggregatorPrice && i.aggregatorPrice > i.ourPrice) && (
              <div className="mt-3 p-3 rounded-xl text-sm" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                🎉 You&apos;re saving compared to other apps by ordering direct!
              </div>
            )}

            {/* Checkout Button */}
            {user ? (
              <Link
                href="/checkout"
                className="block w-full text-center py-4 rounded-xl text-white font-bold text-lg mt-6 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] shadow-glow"
                style={{ background: "var(--primary)" }}
              >
                Proceed to Checkout · <IndianRupee className="w-4 h-4 inline" />{grandTotal}
              </Link>
            ) : (
              <Link
                href="/login"
                className="block w-full text-center py-4 rounded-xl text-white font-bold text-lg mt-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "var(--primary)" }}
              >
                Login to Checkout
              </Link>
            )}
          </>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}