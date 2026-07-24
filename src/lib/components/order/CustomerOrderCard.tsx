"use client";

import Link from "next/link";
import { IndianRupee, Clock, Package, MapPin, AlertCircle, RotateCcw, ChevronRight, CheckCircle, CreditCard } from "lucide-react";
import { Order, OrderStatus } from "@/lib/firestoreSchema";
import { useCart } from "@/lib/contexts";
import { useRouter } from "next/navigation";
import { showToast } from "../common/Toast";

interface CustomerOrderCardProps {
  order: Order & { id: string };
}

export function CustomerOrderCard({ order }: CustomerOrderCardProps) {
  const { replaceCart } = useCart();
  const router = useRouter();

  const isPending = order.status === "pending_payment";
  const isPaymentFailed = order.status === "payment_failed";
  const isCancelled = order.status === "cancelled" || order.status === "refunded";
  const isDelivered = order.status === "delivered";
  const showPayNow = isPending || isPaymentFailed;
  const showReorder = isDelivered || isCancelled;

  const handleReorder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cartItems = order.items.map(item => ({
      ...item,
      qty: item.qty,
    }));
    replaceCart(cartItems, order.merchantId, "Reorder");
    showToast("Items added to cart", "success");
    router.push("/cart");
  };

  const handlePayNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/order/${order.id}`);
  };

  const getStatusBadge = () => {
    if (isPaymentFailed) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Payment Failed
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
          Payment Pending
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
          Cancelled
        </span>
      );
    }
    if (isDelivered) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Delivered
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
        <Package className="w-3 h-3" /> In Progress
      </span>
    );
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Link
      href={`/order/${order.id}`}
      className="group block rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Header row */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold text-sm">
              #{order.id.slice(-8).toUpperCase()}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {formatDate(order.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            <span className="font-bold text-lg flex items-center" style={{ color: "var(--accent)" }}>
              <IndianRupee className="w-4 h-4" />{order.grandTotal}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="mt-2">
          <p className="text-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>
            {order.items.map((item, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1">·</span>}
                {item.qty}x {item.name}
              </span>
            ))}
          </p>
        </div>

        {/* Delivery address */}
        {order.deliveryAddress && (
          <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {order.deliveryAddress.flat}, {order.deliveryAddress.street}, {order.deliveryAddress.city}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {showPayNow && (
          <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handlePayNow}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "var(--primary)" }}
            >
              <CreditCard className="w-4 h-4" />
              {isPaymentFailed ? "Retry Payment" : "Pay Now"}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
              style={{ background: "var(--bg)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {showReorder && (
          <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleReorder}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              <RotateCcw className="w-4 h-4" />
              Reorder
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/order/${order.id}`; }}
              className="flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
              style={{ background: "var(--bg)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!showPayNow && !showReorder && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/order/${order.id}`; }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              View Details
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
