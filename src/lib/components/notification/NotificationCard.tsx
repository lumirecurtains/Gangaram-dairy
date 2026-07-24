"use client";

import Link from "next/link";
import {
  ShoppingBag, CheckCircle, AlertCircle, ChefHat, CookingPot,
  Package, Bike, XCircle, RotateCcw, Gift, Bell, Store, Star,
  Clock
} from "lucide-react";
import type { NotificationType } from "@/lib/firestoreSchema";

const ICON_MAP: Record<string, typeof Bell> = {
  "order.placed": ShoppingBag,
  "payment.success": CheckCircle,
  "payment.failed": AlertCircle,
  "order.accepted": ChefHat,
  "order.preparing": CookingPot,
  "order.ready": Package,
  "rider.assigned": Bike,
  "order.out_for_delivery": Bike,
  "order.delivered": CheckCircle,
  "order.cancelled": XCircle,
  "refund.initiated": RotateCcw,
  "refund.completed": CheckCircle,
  "coupon.applied": Gift,
  "admin.new_order": Store,
  "admin.payment_success": CheckCircle,
  "admin.payment_failed": AlertCircle,
  "admin.new_review": Star,
  "admin.order_cancelled": XCircle,
};

interface NotificationCardProps {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: any;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function getRelativeTime(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getExactTime(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
  return date.toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function NotificationCard({
  id, type, title, body, link, read, createdAt,
  onMarkRead, onDelete,
}: NotificationCardProps) {
  const Icon = ICON_MAP[type] || Bell;

  return (
    <Link
      href={link}
      onClick={(e) => {
        if (!read) onMarkRead(id);
      }}
      className="group flex items-start gap-3 p-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        background: read ? "var(--surface)" : "var(--bg)",
        border: "1px solid var(--border)",
        opacity: read ? 0.75 : 1,
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: read ? "var(--border)" : "var(--primary-light)",
          color: read ? "var(--text-secondary)" : "var(--primary)",
        }}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${read ? "" : "font-semibold"}`}>{title}</p>
          <span className="text-xs whitespace-nowrap flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
            {getRelativeTime(createdAt)}
          </span>
        </div>
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
          {body}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            <Clock className="w-3 h-3 inline mr-0.5" />
            {getExactTime(createdAt)}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
            className="text-[10px] font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--error)" }}
          >
            Delete
          </button>
        </div>
      </div>
    </Link>
  );
}
