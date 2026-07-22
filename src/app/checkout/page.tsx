"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useCart } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { showToast } from "@/lib/components/common/Toast";
import { IndianRupee, ArrowLeft, MapPin, Loader2, CreditCard, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, merchantId, merchantName, subTotal, clearCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    flat: "",
    street: "",
    city: "",
    pincode: "",
    landmark: "",
  });

  const deliveryFee = 30;
  const grandTotal = subTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!address.flat || !address.street || !address.city || !address.pincode) {
      showToast("Please fill in all required delivery address fields", "error");
      return;
    }
    if (!user) {
      showToast("Please login first", "error");
      router.push("/login");
      return;
    }
    if (!merchantId) {
      showToast("Cart is empty", "error");
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await user.getIdToken()}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            itemId: i.itemId,
            name: i.name,
            qty: i.qty,
            ourPrice: i.ourPrice,
            aggregatorPrice: i.aggregatorPrice,
            baseCost: i.baseCost,
            hotelProfit: i.hotelProfit,
          })),
          merchantId,
          deliveryAddress: address,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }

      const data = await res.json();
      clearCart();
      router.push(`/order/${data.orderId}`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Login to checkout</h2>
            <Link href="/login" className="text-sm font-medium" style={{ color: "var(--primary)" }}>Go to login</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/cart" className="p-2 rounded-lg hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>

        {/* Delivery Address */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h2 className="font-bold">Delivery Address</h2>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Flat / House / Apt *"
              value={address.flat}
              onChange={(e) => setAddress({ ...address, flat: e.target.value })}
              className="w-full p-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
            <input
              placeholder="Street / Area *"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
              className="w-full p-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="City *"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full p-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
              <input
                placeholder="Pincode *"
                value={address.pincode}
                onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                className="w-full p-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
            <input
              placeholder="Landmark (optional)"
              value={address.landmark}
              onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
              className="w-full p-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="font-bold mb-3">Order Summary</h2>
          {items.map((item) => (
            <div key={item.itemId} className="flex justify-between text-sm py-1">
              <span style={{ color: "var(--text-secondary)" }}>
                {item.name} x{item.qty}
              </span>
              <span className="font-medium"><IndianRupee className="w-3 h-3 inline" />{item.ourPrice * item.qty}</span>
            </div>
          ))}
        </div>

        {/* Bill */}
        <div className="rounded-xl p-4 mb-6 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Item Total</span>
            <span><IndianRupee className="w-3 h-3 inline" />{subTotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Delivery Fee</span>
            <span><IndianRupee className="w-3 h-3 inline" />{deliveryFee}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <span>Grand Total</span>
            <span><IndianRupee className="w-4 h-4 inline" />{grandTotal}</span>
          </div>
        </div>

        {/* Place Order */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 shadow-glow"
          style={{ background: "var(--primary)" }}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</>
          ) : (
            <><CreditCard className="w-5 h-5" /> Place Order · <IndianRupee className="w-4 h-4" />{grandTotal}</>
          )}
        </button>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
