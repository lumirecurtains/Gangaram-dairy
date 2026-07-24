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
  const isCancelled = order.status === "cancelled" || (order.status as string) === "refunded" || (order.status as string) === "payment_failed";
  const isDelivered = order.status === "delivered";
  
  const handleReorder = () => {
    // Rebuild cart items
    const cartItems = order.items.map(item => ({
      ...item,
      qty: item.qty
    }));
    // We use a generic "Reorder from Previous Merchant" name since we don't store merchantName in order
    replaceCart(cartItems, order.merchantId, "Reorder");
    showToast("Items added to cart", "success");
    router.push("/cart");
  };

  const getStatusBadge = () => {
    if (isPending) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Payment Pending</span>;
    if (isCancelled) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Cancelled</span>;
    if (isDelivered) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Delivered</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1"><Package className="w-3 h-3"/> In Progress</span>;
  };

  const dateStr = (order.createdAt as any)?.toDate?.()?.toLocaleDateString("en-IN", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) || "Unknown date";

  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      {/* Header */}
      <div className="p-4 flex items-start justify-between border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold">Order #{order.id.slice(-8).toUpperCase()}</p>
            {getStatusBadge()}
          </div>
          <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
            <Clock className="w-3 h-3" /> {dateStr}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg flex items-center justify-end" style={{ color: "var(--accent)" }}>
            <IndianRupee className="w-4 h-4" /> {order.grandTotal}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{order.items.length} items</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="space-y-1.5 mb-4">
          {order.items.slice(0, 3).map((item, idx) => (
            <p key={idx} className="text-sm font-medium" style={{ color: "var(--text)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{item.qty}x</span> {item.name}
            </p>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
              +{order.items.length - 3} more items
            </p>
          )}
        </div>

        <div className="flex items-start gap-1.5 text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {order.deliveryAddress.flat}, {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {isPending ? (
            <Link 
              href={`/order/${order.id}`}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "var(--primary)" }}
            >
              <CreditCard className="w-4 h-4" /> Pay Now
            </Link>
          ) : !isCancelled && !isDelivered ? (
            <Link 
              href={`/track/${order.id}`}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "var(--primary)" }}
            >
              <Package className="w-4 h-4" /> Track Order
            </Link>
          ) : (
            <button 
              onClick={handleReorder}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "var(--primary-light)", color: "var(--primary)" }}
            >
              <RotateCcw className="w-4 h-4" /> Reorder
            </button>
          )}
          
          <Link 
            href={`/order/${order.id}`}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-gray-50 border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            View Details <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
