"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { useAuth } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { OrderStatusTimeline } from "@/lib/components/order/OrderStatusTimeline";
import { PaymentSummary } from "@/lib/components/order/PaymentSummary";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { showToast } from "@/lib/components/common/Toast";
import { CreditCard } from "lucide-react";

interface OrderData {
  id: string;
  merchantId: string;
  status: string;
  subTotal: number;
  deliveryFee: number;
  grandTotal: number;
  items: Array<{ name: string; qty: number; ourPrice: number }>;
  deliveryAddress: { flat: string; street: string; city: string };
  createdAt: { toMillis: () => number } | { seconds: number };
}

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const db = getFirebaseFirestore();
    const unsub = onSnapshot(
      doc(db, "orders", id),
      (snap) => {
        if (!snap.exists()) {
          setError("Order not found");
          setLoading(false);
          return;
        }
        setOrder({ id: snap.id, ...snap.data() } as OrderData);
        setLoading(false);
      },
      () => {
        setError("Failed to load order");
        setLoading(false);
      }
    );
    return unsub;
  }, [id, user]);

  const handlePayNow = async () => {
    if (!order || !user) return;
    setPaying(true);

    try {
      const paymentIdempotencyKey = crypto.randomUUID();
      const token = await user.getIdToken();
      const rpRes = await fetch("/api/v1/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": paymentIdempotencyKey,
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const rpData = await rpRes.json();
      if (!rpRes.ok) throw new Error(rpData.error);

      if (rpData.razorpayOrderId.startsWith("order_dev_")) {
        showToast("Mock payment active. Please wait for webhook.", "info");
        setPaying(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(order.grandTotal * 100),
        currency: "INR",
        name: "Gangaram Dairy",
        description: "Food Delivery Order",
        order_id: rpData.razorpayOrderId,
        handler: function () {
          showToast("Payment successful! Waiting for confirmation...", "success");
        },
        prefill: {
          name: user.displayName || "Customer",
          contact: user.phoneNumber || "",
        },
        theme: {
          color: "#FF5722",
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast(err.message || "Failed to initialize payment", "error");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">{error || "Order not found"}</h2>
            <Link href="/" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              Go home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isPending = order.status === "pending_payment";
  const isPaymentFailed = order.status === "payment_failed";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        <Link href="/" className="inline-flex items-center gap-1 text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Success Header */}
        <div className="text-center mb-8">
          {isPending || isPaymentFailed ? (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,179,0,0.15)", color: "var(--warning)" }}>
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,200,83,0.15)", color: "var(--accent)" }}>
              <CheckCircle className="w-8 h-8" />
            </div>
          )}
          <h1 className="text-2xl font-bold">Order Placed!</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
          {isPending && (
            <p className="text-sm mt-2" style={{ color: "var(--warning)" }}>
              ⏳ Waiting for payment confirmation...
            </p>
          )}
          {isPaymentFailed && (
            <p className="text-sm mt-2" style={{ color: "var(--error)" }}>
              ✗ Payment failed. Please try again.
            </p>
          )}
        </div>

        {(isPending || isPaymentFailed) && (
          <div className="mb-6">
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 shadow-glow"
              style={{ background: "var(--primary)" }}
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" /> {isPaymentFailed ? "Retry Payment" : "Pay Now"}
                </>
              )}
            </button>
          </div>
        )}

        {/* Status Timeline */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <OrderStatusTimeline status={order.status} />
        </div>

        {/* Items */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold mb-3">Items Ordered</h3>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span style={{ color: "var(--text-secondary)" }}>
                {item.name} x{item.qty}
              </span>
              <span className="font-medium">
                ₹{item.ourPrice * item.qty}
              </span>
            </div>
          ))}
        </div>

        {/* Payment Summary */}
        <PaymentSummary subTotal={order.subTotal} deliveryFee={order.deliveryFee} grandTotal={order.grandTotal} />

        {/* Delivery Address */}
        <div className="rounded-xl p-4 mt-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold mb-2">Delivery To</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {order.deliveryAddress.flat}, {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </p>
        </div>

        {/* Track Button */}
        <Link
          href={`/track/${order.id}`}
          className="block w-full text-center py-4 rounded-xl text-white font-bold text-lg mt-6 transition-all hover:scale-[1.02]"
          style={{ background: "var(--primary)" }}
        >
          Track Order
        </Link>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
