"use client";

import Link from "next/link";
import { useAuth, useTheme, useCart, useNotification } from "@/lib/contexts";
import { usePathname } from "next/navigation";
import { Store, ShoppingCart, Bell, User, Moon, Sun, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
  const pathname = usePathname();

export function Navbar() {
  const { user, claims, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { itemCount } = useCart();
  const { unreadCount, loading: notifLoading } = useNotification();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showBadge = !notifLoading && unreadCount > 0;

  return (
    <nav className="glass sticky top-0 z-50 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: "var(--primary)" }}>
            G
          </div>
          <span>Gangaram</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-opacity" style={{ color: pathname === "/" ? "var(--primary)" : "var(--text-secondary)" }}>
            Restaurants
          </Link>

          {/* Notifications */}
          <Link href="/notifications" className="relative p-2 rounded-lg hover:opacity-80 transition-opacity">
            <Bell className="w-5 h-5" />
            {showBadge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: "var(--primary)" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Cart */}
          <button onClick={openCartDrawer} className="relative p-2 rounded-lg hover:opacity-80 transition-opacity" aria-label="Open cart">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{ background: "var(--primary)" }}>
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:opacity-80 transition-opacity">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="p-2 rounded-lg hover:opacity-80 transition-opacity">
                <User className="w-5 h-5" />
              </Link>
              <button onClick={logout} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{ color: "var(--text-secondary)" }}>
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all hover:scale-[1.02]" style={{ background: "var(--primary)" }}>
              Login
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:opacity-80">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:opacity-80">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 space-y-2" style={{ background: "var(--surface)" }}>
          <Link href="/notifications" className="flex items-center gap-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
            <Bell className="w-4 h-4" /> Notifications
            {showBadge && <span className="px-1.5 py-0.5 rounded-full text-xs text-white font-bold" style={{ background: "var(--primary)" }}>{unreadCount}</span>}
          </Link>
          <button onClick={() => { openCartDrawer(); setMobileOpen(false); }} className="flex items-center gap-2 py-2 text-sm font-medium">
            <ShoppingCart className="w-4 h-4" /> Cart
            {itemCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs text-white font-bold" style={{ background: "var(--primary)" }}>{itemCount}</span>}
          </Link>
          <Link href="/profile" className="flex items-center gap-2 py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
            <User className="w-4 h-4" /> Profile
          </Link>
          <Link href="/settings/notifications" className="flex items-center gap-2 py-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }} onClick={() => setMobileOpen(false)}>
            <Bell className="w-4 h-4" /> Notification Settings
          </Link>
          {user && (
            <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-2 py-2 text-sm font-medium" style={{ color: "var(--error)" }}>
              <LogOut className="w-4 h-4" /> Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
