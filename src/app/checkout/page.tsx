"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useCart } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { showToast } from "@/lib/components/common/Toast";
import { IndianRupee, ArrowLeft, MapPin, Loader2, CreditCard, CheckCircle, AlertCircle, ShoppingCart as CartIcon } from "lucide-react";
import { AddressSelector } from "@/lib/components/address/AddressSelector";
import { getFirebaseFirestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { PaymentSummary } from "@/lib/components/order/PaymentSummary";
import Link from "next/link";
import { PLATFORM_CONFIG } from "@/lib/config/constants";

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
  const [addressLoading, setAddressLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAddr = async () => {
      try {
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.addresses && data.addresses.length > 0) {
            setAddress(data.addresses[0]);
          } else if (data.address && typeof data.address === 'string') {
            // Legacy fallback
            setAddress(prev => ({ ...prev, street: data.address }));
          }
        }
      } catch (err) {
        console.error("Failed to load address:", err);
      } finally {
        setAddressLoading(false);
      }
    };
    fetchAddr();
  }, [user]);

  const handleAddressChange = async (newAddr: AddressFields) => {
    setAddress(newAddr);
    if (!user) return;
    try {
      const db = getFirebaseFirestore();
      await updateDoc(doc(db, "users", user.uid), {
        addresses: [newAddr] // Overwrite or prepend to addresses
      });
    } catch (err) {
      console.error("Failed to save address:", err);
    }
  };

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          couponCode,
          merchantId: merchantId,
          items: items.map(i => ({ itemId: i.itemId, qty: i.qty })),
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
  const deliveryFee = PLATFORM_CONFIG.DELIVERY_FEE;
  const grandTotal = netSubTotal + deliveryFee;

  const handlePlaceOrder = async () => {
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

    if (items.length === 0) {
      showToast("Cart is empty", "error");
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const token = await user.getIdToken();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          items: items.map(item => ({
            itemId: item.itemId, name: item.name, qty: item.qty, ourPrice: item.ourPrice,
            aggregatorPrice: item.aggregatorPrice, baseCost: item.baseCost, hotelProfit: item.hotelProfit
          })),
          merchantId,
          deliveryAddress: address,
          couponCode: discountPercent > 0 ? couponCode : undefined,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create order");
      }

      const orderData = await res.json();
      clearCart();
      router.push(`/order/${orderData.orderId}`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        showToast("Order creation timed out. Please try again.", "error");
      } else {
        showToast(err.message || "Something went wrong", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2 heading-tight">Login to checkout</h2>
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
            <h2 className="text-xl font-bold mb-2 heading-tight">Your cart is empty</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Add items from a restaurant to get started.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-[0.98]" style={{ background: "var(--primary)" }}>
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
          <Link href="/cart" className="p-2 rounded-lg hover:opacity-80 active:scale-[0.98]" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold heading-tight">Checkout</h1>
        </div>

        {/* Delivery Address */}
        <div className="mb-4">
          {addressLoading ? (
             <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
               <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
             </div>
          ) : (
            <AddressSelector 
              defaultAddress={address}
              onChange={handleAddressChange}
            />
          )}
        </div>

        {/* Order Summary */}
        <div className="rounded-xl p-5 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="font-bold mb-3">Order Summary</h2>
          {items.map((item) => (
            <div key={item.itemId} className="flex justify-between text-sm py-1">
              <span style={{ color: "var(--text-secondary)" }}>{item.name} x{item.qty}</span>
              <span className="font-medium tabular-nums">
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
              inputMode="text"
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
              className="min-h-[44px] px-4 rounded-lg font-bold text-sm transition-all text-white hover:opacity-90 disabled:opacity-50"
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
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100 shadow-glow"
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
