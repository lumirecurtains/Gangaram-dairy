"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useCart } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { showToast } from "@/lib/components/common/Toast";
import { IndianRupee, ArrowLeft, MapPin, Loader2, CreditCard, CheckCircle, AlertCircle, ShoppingCart as CartIcon } from "lucide-react";
import { PaymentSummary } from "@/lib/components/order/PaymentSummary";
import Link from "next/link";

interface AddressFields {
  flat: string;
  street: string;
  city: string;
  pincode: string;
  landmark: string;
}

type TouchedFields = Record<keyof AddressFields, boolean>;

const REQUIRED_FIELDS: (keyof AddressFields)[] = ["flat", "street", "city", "pincode"];
const FIELD_LABELS: Record<keyof AddressFields, string> = {
  flat: "Flat / House / Apt",
  street: "Street / Area",
  city: "City",
  pincode: "Pincode",
  landmark: "Landmark",
};

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, merchantId, merchantName, subTotal, clearCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<AddressFields>({
    flat: "", street: "", city: "", pincode: "", landmark: "",
  });
  const [touched, setTouched] = useState<TouchedFields>({
    flat: false, street: false, city: false, pincode: false, landmark: false,
  });

  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleFieldChange = (field: keyof AddressFields, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setTouched((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleFieldBlur = (field: keyof AddressFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setValidatingCoupon(true);
    setCouponError("");
    setDiscountPercent(0);

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/promotions/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          couponCode, merchantId, subTotal,
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
    // Mark all fields as touched
    setTouched({ flat: true, street: true, city: true, pincode: true, landmark: true });

    // Validate required fields
    const emptyFields = REQUIRED_FIELDS.filter((f) => !address[f]?.trim());
    if (emptyFields.length > 0) {
      showToast(`Please fill in: ${emptyFields.map((f) => FIELD_LABELS[f]).join(", ")}`, "error");
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const idempotencyKey = crypto.randomUUID();
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          items: items.map((item) => ({
            itemId: item.itemId, name: item.name, qty: item.qty, ourPrice: item.ourPrice,
          })),
          merchantId,
          deliveryAddress: address,
          couponCode: discountPercent > 0 ? couponCode : undefined,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }

      const orderData = await res.json();
      clearCart();

      const paymentIdempotencyKey = crypto.randomUUID();
      const rpRes = await fetch("/api/v1/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": paymentIdempotencyKey,
        },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });

      const rpData = await rpRes.json();

      if (!rpRes.ok) {
        showToast(rpData.error || "Payment setup failed. You can retry from the order page.", "warning");
        router.push(`/order/${orderData.orderId}`);
        return;
      }

      if (rpData.razorpayOrderId.startsWith("order_dev_")) {
        showToast("Mock payment success. Order placed.", "success");
        setTimeout(() => router.push(`/order/${orderData.orderId}`), 1000);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(grandTotal * 100),
        currency: "INR",
        name: "Gangaram Dairy",
        description: "Food Delivery Order",
        order_id: rpData.razorpayOrderId,
        handler: function () {
          showToast("Payment successful! Redirecting...", "success");
          router.push(`/order/${orderData.orderId}`);
        },
        prefill: { name: user.displayName || "Customer", contact: user.phoneNumber || "" },
        theme: { color: "#FF5722" },
        modal: {
          ondismiss: function () {
            showToast("Payment cancelled. You can try again from the order page.", "warning");
            router.push(`/order/${orderData.orderId}`);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        showToast("Request timed out. Please try again.", "error");
      } else {
        showToast(err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldStyle = (field: keyof AddressFields) => ({
    background: "var(--bg)",
    color: "var(--text)",
    border: `1px solid ${touched[field] && !address[field]?.trim() ? "var(--error)" : "var(--border)"}`,
    transition: "border 200ms ease",
  });

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">Login to checkout</h2>
            <Link href="/login" className="text-sm font-medium" style={{ color: "var(--primary)" }}>Go to login</Link>
          </div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <CartIcon className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Add items from a restaurant to get started.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105" style={{ background: "var(--primary)" }}>
              Browse Restaurants
            </Link>
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
        <div className="rounded-xl p-5 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h2 className="font-bold">Delivery Address</h2>
          </div>
          <div className="space-y-3">
            {(["flat", "street"] as const).map((field) => (
              <div key={field}>
                <input
                  placeholder={`${FIELD_LABELS[field]} *`}
                  value={address[field]}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  onBlur={() => handleFieldBlur(field)}
                  className="w-full p-3 rounded-xl text-sm outline-none"
                  style={getFieldStyle(field)}
                  aria-invalid={touched[field] && !address[field]?.trim()}
                  aria-describedby={touched[field] && !address[field]?.trim() ? `${field}-error` : undefined}
                />
                {touched[field] && !address[field]?.trim() && (
                  <p id={`${field}-error`} className="text-xs mt-1" style={{ color: "var(--error)" }}>
                    {FIELD_LABELS[field]} is required
                  </p>
                )}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {(["city", "pincode"] as const).map((field) => (
                <div key={field}>
                  <input
                    placeholder={`${FIELD_LABELS[field]} *`}
                    value={address[field]}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    onBlur={() => handleFieldBlur(field)}
                    className="w-full p-3 rounded-xl text-sm outline-none"
                    style={getFieldStyle(field)}
                    aria-invalid={touched[field] && !address[field]?.trim()}
                    aria-describedby={touched[field] && !address[field]?.trim() ? `${field}-error` : undefined}
                  />
                  {touched[field] && !address[field]?.trim() && (
                    <p id={`${field}-error`} className="text-xs mt-1" style={{ color: "var(--error)" }}>
                      {FIELD_LABELS[field]} is required
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <input
                placeholder="Landmark (optional)"
                value={address.landmark}
                onChange={(e) => handleFieldChange("landmark", e.target.value)}
                onBlur={() => handleFieldBlur("landmark")}
                className="w-full p-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-xl p-5 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="font-bold mb-3">Order Summary</h2>
          {items.map((item) => (
            <div key={item.itemId} className="flex justify-between text-sm py-1">
              <span style={{ color: "var(--text-secondary)" }}>{item.name} x{item.qty}</span>
              <span className="font-medium">
                <IndianRupee className="w-3 h-3 inline" />{item.ourPrice * item.qty}
              </span>
            </div>
          ))}
        </div>

        {/* Payment Summary */}
        <PaymentSummary subTotal={subTotal} deliveryFee={deliveryFee} discount={discountAmount} grandTotal={grandTotal} />

        {/* Coupon */}
        <div className="mt-4 mb-6 p-5 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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
              onClick={discountPercent > 0 ? () => { setDiscountPercent(0); setCouponCode(""); } : handleApplyCoupon}
              disabled={validatingCoupon || (!couponCode && discountPercent === 0)}
              className="px-4 py-2 rounded-lg font-bold text-sm transition-all text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: discountPercent > 0 ? "var(--error)" : "var(--primary)" }}
            >
              {validatingCoupon ? "..." : discountPercent > 0 ? "Remove" : "Apply"}
            </button>
          </div>
          {couponError && <p className="text-xs mt-2" style={{ color: "var(--error)" }}>{couponError}</p>}
          {discountPercent > 0 && (
            <p className="text-xs mt-2 font-bold" style={{ color: "var(--accent)" }}>
              <CheckCircle className="w-3 h-3 inline mr-1" />{discountPercent}% discount applied!
            </p>
          )}
        </div>

        {/* Place Order */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 shadow-glow"
          style={{ background: "var(--primary)" }}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Placing Order...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" /> Place Order · <IndianRupee className="w-4 h-4" />
              {grandTotal}
            </>
          )}
        </button>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
