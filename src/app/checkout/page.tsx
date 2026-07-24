"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useCart } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { showToast } from "@/lib/components/common/Toast";
import { IndianRupee, ArrowLeft, MapPin, Loader2, CreditCard, CheckCircle } from "lucide-react";
import { PaymentSummary } from "@/lib/components/order/PaymentSummary";
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


  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setValidatingCoupon(true);
    setCouponError("");
    setDiscountPercent(0);

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/promotions/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          couponCode,
          merchantId: merchantId,
          subTotal: subTotal,
          hotelShareBeforeDiscount: subTotal * 0.7,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.valid) {
        setDiscountPercent(data.discountPercent);
        showToast("Coupon applied!", "success");
      } else {
        setCouponError(data.reason);
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const discountAmount = Math.floor(subTotal * (discountPercent / 100));
  const netSubTotal = subTotal - discountAmount;
  const deliveryFee = 30;
  const grandTotal = netSubTotal + deliveryFee;

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
          items: items.map(item => ({
            itemId: item.itemId,
            name: item.name,
            qty: item.qty,
            ourPrice: item.ourPrice,
          })),
          merchantId: merchantId,
          deliveryAddress: address,
          couponCode: discountPercent > 0 ? couponCode : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }

      const orderData = await res.json();
      clearCart();

      // Launch payment process directly from checkout
      const token = await user?.getIdToken();
      const rpRes = await fetch("/api/v1/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: orderData.orderId })
      });

      const rpData = await rpRes.json();
      
      if (!rpRes.ok) {
        // If razorpay setup fails, redirect to order status where they can "Pay Again" later
        router.push(`/order/${orderData.orderId}`);
        return;
      }

      if (rpData.razorpayOrderId.startsWith("order_dev_")) {
        // Mock environment
        showToast("Mock payment success. Order placed.", "success");
        // Simulate webhook
        setTimeout(() => router.push(`/order/${orderData.orderId}`), 1000);
        return;
      }

      // Initialize real Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Safe to expose
        amount: Math.round(grandTotal * 100),
        currency: "INR",
        name: "Gangaram Dairy",
        description: "Food Delivery Order",
        order_id: rpData.razorpayOrderId,
        handler: function(response: any) {
          showToast("Payment successful! Redirecting...", "success");
          router.push(`/order/${orderData.orderId}`);
        },
        prefill: {
          name: user.displayName || "Customer",
          contact: user.phoneNumber || "",
        },
        theme: {
          color: "#FF5722"
        },
        modal: {
          ondismiss: function() {
            showToast("Payment cancelled. You can try again from the order page.", "warning");
            router.push(`/order/${orderData.orderId}`);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

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

        {/* Payment Summary */}
        <PaymentSummary 
          subTotal={subTotal} 
          deliveryFee={deliveryFee} 
          discount={discountAmount} 
          grandTotal={grandTotal} 
        />
        
        {/* Coupon Section */}
        <div className="mt-4 mb-6 p-4 rounded-xl border bg-[var(--surface)]" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold mb-3 text-sm">Have a Promo Code?</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={couponCode} 
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter code" 
              disabled={discountPercent > 0}
              className="flex-1 p-3 rounded-lg border text-sm uppercase outline-none focus:border-[var(--primary)]"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
            <button 
              onClick={discountPercent > 0 ? () => {setDiscountPercent(0); setCouponCode("");} : handleApplyCoupon}
              disabled={validatingCoupon || (!couponCode && discountPercent === 0)}
              className="px-4 py-2 rounded-lg font-bold text-sm transition-all text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: discountPercent > 0 ? "var(--error)" : "var(--primary)" }}
            >
              {validatingCoupon ? "..." : discountPercent > 0 ? "Remove" : "Apply"}
            </button>
          </div>
          {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
          {discountPercent > 0 && <p className="text-green-500 text-xs mt-2 font-bold">{discountPercent}% discount applied!</p>}
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
