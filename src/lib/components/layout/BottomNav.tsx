"use client";

import Link from "next/link";
import { useAuth, useCart, useNotification } from "@/lib/contexts";
import { usePathname } from "next/navigation";
import { Store, ShoppingCart, Bell, User, LogIn, Package } from "lucide-react";

export function BottomNav() {
  const { user } = useAuth();
  const { itemCount, openCartDrawer } = useCart();
  const { unreadCount, loading } = useNotification();
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t glass"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="h-full flex items-center justify-around px-2">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity" style={{ color: pathname === "/" ? "var(--primary)" : "" }}>
          <Store className="w-5 h-5" />
          Home
        </Link>

        <button onClick={openCartDrawer} className="relative flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity" style={{ color: "var(--text)" }}>
          <ShoppingCart className="w-5 h-5" />
          Cart
          {itemCount > 0 && (
            <span className="absolute -top-1 right-0 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center" style={{ background: "var(--primary)" }}>
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </button>

        <Link href="/orders" className="flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity">
          <Package className="w-5 h-5" />
          Orders
        </Link>

        <Link href="/notifications" className="relative flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity" style={{ color: pathname.startsWith("/notifications") ? "var(--primary)" : "" }}>
          <Bell className="w-5 h-5" />
          Alerts
          {!loading && unreadCount > 0 && (
            <span className="absolute -top-1 right-0 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center" style={{ background: "var(--primary)" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {user ? (
          <Link href="/profile" className="flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity" style={{ color: pathname === "/profile" || pathname.startsWith("/settings") ? "var(--primary)" : "" }}>
            <User className="w-5 h-5" />
            Profile
          </Link>
        ) : (
          <Link href="/login" className="flex flex-col items-center gap-0.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity">
            <LogIn className="w-5 h-5" />
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}