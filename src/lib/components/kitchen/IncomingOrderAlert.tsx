"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  orderBy,
  type DocumentData,
} from "firebase/firestore";
import { useAuth } from "@/lib/contexts";
import { showToast } from "@/lib/components/common/Toast";
import {
  Bell,
  IndianRupee,
  Clock,
  MapPin,
  CheckCheck,
  Volume2,
  VolumeX,
  X,
  Loader2,
} from "lucide-react";

interface OrderDoc {
  id: string;
  items: Array<{ name: string; qty: number; ourPrice: number }>;
  subTotal: number;
  deliveryFee: number;
  grandTotal: number;
  deliveryAddress: { flat: string; street: string; city: string };
  status: string;
  createdAt: Timestamp;
  userId: string;
}

export function IncomingOrderAlert() {
  const { user, claims } = useAuth();
  const merchantId = (claims as any)?.merchantId;
  const [paidOrders, setPaidOrders] = useState<OrderDoc[]>([]);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for new paid orders for this merchant
  useEffect(() => {
    if (!merchantId) return;

    const db = getFirebaseFirestore();
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("merchantId", "==", merchantId),
      where("status", "==", "paid"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OrderDoc, "id">),
      })) as OrderDoc[];
      setPaidOrders(orders);
    });

    return unsub;
  }, [merchantId]);

  // Looping alert sound
  useEffect(() => {
    if (paidOrders.length > 0 && soundEnabled) {
      playAlertSound();
      alertIntervalRef.current = setInterval(() => {
        playAlertSound();
      }, 4000);
    }

    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current);
        alertIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidOrders.length, soundEnabled]);

  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      // Create a beeping sequence
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.12);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.12);
      }
    } catch {
      // Audio not available — silently degrade
    }
  }, []);

  const acknowledgeOrder = useCallback(
    async (orderId: string) => {
      setAcknowledging(orderId);
      try {
        const db = getFirebaseFirestore();
        await updateDoc(doc(db, "orders", orderId), {
          acknowledgedAt: Timestamp.now(),
        });
        setPaidOrders((prev) => prev.filter((o) => o.id !== orderId));
        showToast("Order acknowledged", "success");
      } catch (err: any) {
        showToast("Failed to acknowledge", "error");
      } finally {
        setAcknowledging(null);
      }
    },
    []
  );

  const acknowledgeAll = useCallback(async () => {
    for (const order of paidOrders) {
      await acknowledgeOrder(order.id);
    }
  }, [paidOrders, acknowledgeOrder]);

  if (paidOrders.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-bounce-in"
      style={{ background: "rgba(0, 0, 0, 0.7)" }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
              style={{ background: "rgba(255,87,34,0.2)", color: "var(--primary)" }}
            >
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                New Order{paidOrders.length > 1 ? "s" : ""}!
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {paidOrders.length} order{paidOrders.length > 1 ? "s" : ""} waiting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled((p) => !p)}
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
              aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
            {/* Acknowledge all */}
            {paidOrders.length > 1 && (
              <button
                onClick={acknowledgeAll}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105"
                style={{ background: "var(--primary)" }}
              >
                <CheckCheck className="w-4 h-4" />
                Accept All ({paidOrders.length})
              </button>
            )}
          </div>
        </div>

        {/* Order Cards */}
        <div className="space-y-4">
          {paidOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl p-4"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-lg">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {order.createdAt?.toDate?.().toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className="text-lg font-bold flex items-center"
                  style={{ color: "var(--accent)" }}
                >
                  <IndianRupee className="w-4 h-4" />
                  {order.grandTotal}
                </span>
              </div>

              {/* Items list */}
              <div className="space-y-1 mb-3">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span>
                      {item.name} x{item.qty}
                    </span>
                    <span>&#x20B9;{item.ourPrice * item.qty}</span>
                  </div>
                ))}
              </div>

              {/* Delivery address */}
              {order.deliveryAddress && (
                <div
                  className="flex items-start gap-1.5 text-xs mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    {order.deliveryAddress.flat}, {order.deliveryAddress.street},{" "}
                    {order.deliveryAddress.city}
                  </span>
                </div>
              )}

              {/* Acknowledge button */}
              <button
                onClick={() => acknowledgeOrder(order.id)}
                disabled={acknowledging === order.id}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                style={{ background: "var(--primary)" }}
              >
                {acknowledging === order.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Acknowledging...
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-5 h-5" /> Acknowledge &amp; Start
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
