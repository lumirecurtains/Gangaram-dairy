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
import { DriverCard } from "@/lib/components/order/DriverCard";
import { Loader2, ArrowLeft, Bike } from "lucide-react";
import Link from "next/link";

interface OrderData {
  status: string;
  riderId: string | null;
  deliveryAddress: { flat: string; street: string; city: string };
  merchantId: string;
  items: Array<{ name: string; qty: number }>;
}

export default function TrackOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const db = getFirebaseFirestore();
    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (snap.exists()) {
        setOrder(snap.data() as OrderData);
      }
      setLoading(false);
    });
    return unsub;
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p>Order not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        <Link href={`/order/${id}`} className="inline-flex items-center gap-1 text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Order
        </Link>

        <h1 className="text-2xl font-bold mb-6">Track Order</h1>

        {/* Live Map Placeholder */}
        <div
          className="h-48 rounded-xl mb-6 flex items-center justify-center overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="text-center">
            <Bike className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--primary)" }} />
            <p className="text-sm font-medium">Live tracking map</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Showing real-time location</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <OrderStatusTimeline status={order.status} />
        </div>

        {/* Driver Info */}
        {order.riderId && (
          <div className="mb-4">
            <DriverCard name="Delivery Partner" />
          </div>
        )}

        {/* Delivery Address */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold mb-2">Delivering to</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {order.deliveryAddress.flat}, {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </p>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
