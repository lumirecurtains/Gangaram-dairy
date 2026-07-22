"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  type DocumentData,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { JobCard } from "@/lib/components/driver/JobCard";
import { DeliveryProofCapture } from "@/lib/components/driver/DeliveryProofCapture";
import { showToast } from "@/lib/components/common/Toast";
import { Modal } from "@/lib/components/common/Modal";
import { PaymentSummary } from "@/lib/components/order/PaymentSummary";
import { Skeleton } from "@/lib/components/common/Skeleton";
import {
  Loader2,
  Bike,
  IndianRupee,
  PackageCheck,
  Clock,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { jsPDF } from "jspdf";

interface OrderDoc {
  id: string;
  items: Array<{ name: string; qty: number; ourPrice: number }>;
  subTotal: number;
  deliveryFee: number;
  grandTotal: number;
  deliveryAddress: { flat: string; street: string; city: string };
  status: string;
  createdAt: Timestamp;
  riderId: string | null;
  userId: string;
}

export default function DriverDashboardPage() {
  const { user, claims, loading: authLoading } = useAuth();
  const role = (claims as any)?.role;
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [proofModalOrder, setProofModalOrder] = useState<OrderDoc | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderDoc | null>(null);
  const [capturedProof, setCapturedProof] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Fetch orders relevant to this rider
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getFirebaseFirestore();
    const ordersRef = collection(db, "orders");

    // Rider sees: ready orders (available), their own out_for_delivery/delivered orders
    const q = query(
      ordersRef,
      where("status", "in", ["ready", "out_for_delivery", "delivered"]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OrderDoc, "id">),
        })) as OrderDoc[];
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load orders:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  const handleAcceptJob = useCallback(async (orderId: string) => {
    setTransitioningId(orderId);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/v1/orders/${orderId}/delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "ACCEPT_JOB" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to accept job");
      }

      showToast("Job accepted! Head to the restaurant.", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setTransitioningId(null);
    }
  }, [user]);

  const openProofModal = useCallback((order: OrderDoc) => {
    setProofModalOrder(order);
    setCapturedProof(null);
  }, []);

  const handleMarkDelivered = useCallback(async () => {
    if (!proofModalOrder) return;
    setSubmittingProof(true);

    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/v1/orders/${proofModalOrder.id}/delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "MARK_DELIVERED",
          proofDataString: capturedProof || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark delivered");
      }

      showToast("Delivery confirmed!", "success");
      setProofModalOrder(null);
      setCapturedProof(null);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmittingProof(false);
    }
  }, [proofModalOrder, capturedProof, user]);

  const generateInvoice = useCallback((order: OrderDoc) => {
    setInvoiceOrder(order);
  }, []);

  const downloadInvoicePdf = useCallback(() => {
    if (!invoiceOrder) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(255, 87, 34);
    doc.text("Gangaram", pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(26, 26, 46);
    doc.text("Delivery Invoice", pageWidth / 2, 42, { align: "center" });

    // Order ID
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Order #${invoiceOrder.id.slice(-8).toUpperCase()}`, pageWidth / 2, 52, {
      align: "center",
    });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 60, pageWidth - 20, 60);

    // Items header
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 46);
    doc.text("Items", 20, 75);

    let y = 85;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);

    invoiceOrder.items.forEach((item) => {
      doc.text(`${item.name} x${item.qty}`, 25, y);
      doc.text(`\u20B9${item.ourPrice * item.qty}`, pageWidth - 25, y, {
        align: "right",
      });
      y += 8;
    });

    // Totals
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setTextColor(100, 116, 139);
    doc.text("Item Total", 20, y);
    doc.text(`\u20B9${invoiceOrder.subTotal}`, pageWidth - 25, y, { align: "right" });
    y += 7;

    doc.text("Delivery Fee", 20, y);
    doc.text(`\u20B9${invoiceOrder.deliveryFee}`, pageWidth - 25, y, { align: "right" });
    y += 7;

    doc.setDrawColor(226, 232, 240);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(26, 26, 46);
    doc.setFont("", "bold");
    doc.text("Grand Total", 20, y);
    doc.text(`\u20B9${invoiceOrder.grandTotal}`, pageWidth - 25, y, { align: "right" });

    // Delivery address
    y += 20;
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 46);
    doc.setFont("", "normal");
    doc.text("Delivered To", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${invoiceOrder.deliveryAddress.flat}, ${invoiceOrder.deliveryAddress.street}`,
      20,
      y
    );
    y += 6;
    doc.text(invoiceOrder.deliveryAddress.city, 20, y);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Thank you for ordering with Gangaram!",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );

    doc.save(`invoice-${invoiceOrder.id.slice(-8)}.pdf`);
    setInvoiceOrder(null);
  }, [invoiceOrder]);

  // Derive filtered lists
  const availableJobs = orders.filter(
    (o) => o.status === "ready" && !o.riderId
  );
  const myActiveJobs = orders.filter(
    (o) => o.riderId === user?.uid && (o.status === "ready" || o.status === "out_for_delivery")
  );
  const myCompletedJobs = orders.filter(
    (o) => o.riderId === user?.uid && o.status === "delivered"
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full pb-24">
          <div className="space-y-4">
            <Skeleton className="w-1/2 h-8 rounded-lg mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <Skeleton className="w-3/4 h-5 rounded mb-3" />
                  <Skeleton className="w-full h-4 rounded mb-2" />
                  <Skeleton className="w-1/2 h-4 rounded mb-3" />
                  <Skeleton className="w-full h-10 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  if (!user || role !== "rider") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">Driver Access Only</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              This dashboard is for delivery riders only.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105"
              style={{ background: "var(--primary)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Go Home
            </Link>
          </div>
        </main>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full pb-24">
        {/* Header with stats */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Bike className="w-7 h-7" style={{ color: "var(--primary)" }} />
            Driver Dashboard
          </h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{availableJobs.length}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Available</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{myActiveJobs.length}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Active</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--text-secondary)" }}>{myCompletedJobs.length}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Completed</p>
          </div>
        </div>

        {/* Available Jobs */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Available Jobs
          </h2>
          {availableJobs.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <Bike className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: "var(--text-secondary)" }} />
              <p className="font-medium">No available jobs right now</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableJobs.map((order) => (
                <JobCard
                  key={order.id}
                  orderId={order.id}
                  status="ready"
                  items={order.items}
                  grandTotal={order.grandTotal}
                  deliveryAddress={order.deliveryAddress}
                  deliveryFee={order.deliveryFee}
                  createdAt={order.createdAt}
                  riderId={order.riderId}
                  currentUserId={user?.uid || ""}
                  isMyJob={false}
                  onAccept={() => handleAcceptJob(order.id)}
                  isTransitioning={transitioningId === order.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Active Deliveries */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <PackageCheck className="w-5 h-5" style={{ color: "var(--primary)" }} />
            Active Deliveries
          </h2>
          {myActiveJobs.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="font-medium">No active deliveries</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Accept a job to start delivering
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myActiveJobs.map((order) => (
                <JobCard
                  key={order.id}
                  orderId={order.id}
                  status={order.status as "out_for_delivery" | "ready"}
                  items={order.items}
                  grandTotal={order.grandTotal}
                  deliveryAddress={order.deliveryAddress}
                  deliveryFee={order.deliveryFee}
                  createdAt={order.createdAt}
                  riderId={order.riderId}
                  currentUserId={user?.uid || ""}
                  isMyJob={true}
                  onMarkDelivered={() => openProofModal(order)}
                  isTransitioning={transitioningId === order.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Completed Deliveries */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
            Completed
          </h2>
          {myCompletedJobs.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="font-medium" style={{ color: "var(--text-secondary)" }}>No completed deliveries yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCompletedJobs.map((order) => (
                <JobCard
                  key={order.id}
                  orderId={order.id}
                  status="delivered"
                  items={order.items}
                  grandTotal={order.grandTotal}
                  deliveryAddress={order.deliveryAddress}
                  deliveryFee={order.deliveryFee}
                  createdAt={order.createdAt}
                  riderId={order.riderId}
                  currentUserId={user?.uid || ""}
                  isMyJob={true}
                  onViewInvoice={() => generateInvoice(order)}
                  isTransitioning={false}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Delivery Proof Modal */}
      {proofModalOrder && (
        <Modal
          isOpen={true}
          onClose={() => !submittingProof && setProofModalOrder(null)}
          title="Complete Delivery"
        >
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Capture or upload a photo as delivery proof for order{' '}
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                #{proofModalOrder.id.slice(-8).toUpperCase()}
              </span>
            </p>

            <DeliveryProofCapture
              onCapture={setCapturedProof}
              disabled={submittingProof}
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setProofModalOrder(null);
                  setCapturedProof(null);
                }}
                disabled={submittingProof}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: "var(--bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDelivered}
                disabled={submittingProof || !capturedProof}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {submittingProof ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><PackageCheck className="w-4 h-4" /> Confirm Delivery</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <Modal
          isOpen={true}
          onClose={() => setInvoiceOrder(null)}
          title="Delivery Invoice"
        >
          <div className="space-y-4">
            <p className="text-sm font-medium">
              Order #{invoiceOrder.id.slice(-8).toUpperCase()}
            </p>

            <PaymentSummary
              subTotal={invoiceOrder.subTotal}
              deliveryFee={invoiceOrder.deliveryFee}
              grandTotal={invoiceOrder.grandTotal}
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setInvoiceOrder(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: "var(--bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Close
              </button>
              <button
                onClick={downloadInvoicePdf}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02]"
                style={{ background: "var(--primary)" }}
              >
                <Receipt className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Footer />
      <BottomNav />
    </div>
  );
}
