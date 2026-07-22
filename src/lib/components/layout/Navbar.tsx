"use client";

import Link from "next/link";
import { useAuth, useTheme, useCart } from "@/lib/contexts";
import { Store, ShoppingCart, User, Moon, Sun, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, claims, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <Link href="/" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--text-secondary)" }}>
            Restaurants
          </Link>

          {/* Cart */}
          <Link href="/cart" className="relative p-2 rounded-lg hover:opacity-80 transition-opacity">
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

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="p-2 rounded-lg hover:opacity-80 transition-opacity">
                <User className="w-5 h-5" />
              </Link>
              {(claims as any)?.role === "merchant_staff" && (
                <Link href="/kitchen" className="text-sm px-3 py-1.5 rounded-lg" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                  Kitchen
                </Link>
              )}
              <button onClick={logout} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{ color: "var(--error)" }}>
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all hover:scale-105"
              style={{ background: "var(--primary)" }}
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 space-y-3 animate-slide-in">
          <Link href="/" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Restaurants</Link>
          <Link href="/cart" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
            Cart {itemCount > 0 && `(${itemCount})`}
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Profile</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-2 text-sm font-medium" style={{ color: "var(--error)" }}>Logout</button>
            </>
          ) : (
            <Link href="/login" className="block py-2 text-sm font-medium" style={{ color: "var(--primary)" }} onClick={() => setMobileOpen(false)}>Login</Link>
          )}
          <button onClick={toggleTheme} className="flex items-center gap-2 py-2 text-sm font-medium">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      )}
    </nav>
  );
}
