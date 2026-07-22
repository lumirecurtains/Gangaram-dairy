"use client";

import Link from "next/link";
import { useAuth, useCart } from "@/lib/contexts";
import { Store, ShoppingCart, User, LogIn } from "lucide-react";

export function BottomNav() {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t glass"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="h-full flex items-center justify-around px-2">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity">
          <Store className="w-5 h-5" />
          Home
        </Link>

        <Link href="/cart" className="relative flex flex-col items-center gap-0.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity">
          <ShoppingCart className="w-5 h-5" />
          Cart
          {itemCount > 0 && (
            <span className="absolute -top-1 right-0 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center" style={{ background: "var(--primary)" }}>
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </Link>

        {user ? (
          <Link href="/profile" className="flex flex-col items-center gap-0.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity">
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
