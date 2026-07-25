const fs = require('fs');

const bottomnav = `"use client";

import Link from "next/link";
import { NavLink } from "./NavLink";
import { useAuth, useCart, useNotification } from "@/lib/contexts";
import { usePathname } from "next/navigation";
import { Store, ShoppingCart, Bell, User, LogIn, Package } from "lucide-react";

export function BottomNav() {
  const { user } = useAuth();
  const { itemCount, openCartDrawer } = useCart();
  const { unreadCount, loading } = useNotification();
  const pathname = usePathname();

  const baseClass = "flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity";
  const activeClass = "text-[var(--primary)] opacity-100";
  const inactiveClass = "opacity-70 hover:opacity-100";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t glass"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="h-full flex items-center justify-around px-2">
        <NavLink href="/" className={baseClass} activeClassName={activeClass} inactiveClassName={inactiveClass}>
          <Store className="w-5 h-5" />
          Home
        </NavLink>

        <button onClick={openCartDrawer} className="relative flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity opacity-70 hover:opacity-100" style={{ color: "var(--text)" }}>
          <ShoppingCart className="w-5 h-5" />
          Cart
          {itemCount > 0 && (
            <span aria-live="polite" aria-atomic="true" className="absolute -top-1 right-0 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center" style={{ background: "var(--primary)" }}>
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </button>

        <NavLink href="/orders" className={baseClass} activeClassName={activeClass} inactiveClassName={inactiveClass}>
          <Package className="w-5 h-5" />
          Orders
        </NavLink>

        <NavLink href="/notifications" className={baseClass} activeClassName={activeClass} inactiveClassName={inactiveClass}>
          <div className="relative">
            <Bell className="w-5 h-5" />
            {!loading && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: "var(--primary)" }} />
            )}
          </div>
          Alerts
        </NavLink>

        {user ? (
          <NavLink href="/profile" className={baseClass} activeClassName={activeClass} inactiveClassName={inactiveClass}>
            <User className="w-5 h-5" />
            Profile
          </NavLink>
        ) : (
          <NavLink href="/login" className={baseClass} activeClassName={activeClass} inactiveClassName={inactiveClass}>
            <LogIn className="w-5 h-5" />
            Login
          </NavLink>
        )}
      </div>
    </nav>
  );
}
`;

fs.writeFileSync('src/lib/components/layout/BottomNav.tsx', bottomnav);
