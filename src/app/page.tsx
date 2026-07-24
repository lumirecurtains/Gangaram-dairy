"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { RestaurantList } from "@/lib/components/restaurant/RestaurantList";
import { FloatingCartButton } from "@/lib/components/cart/FloatingCartButton";
import { Loader2, Store, UtensilsCrossed, Package, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full pb-24 md:pb-12">
        {/* Hero for non-logged in users */}
        {!user && (
          <section className="mb-10 text-center py-12 px-6 rounded-2xl relative overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(circle at 50% 50%, var(--primary) 0%, transparent 70%)" }} />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "var(--primary-light)" }}>
                <Store className="w-7 h-7" style={{ color: "var(--primary)" }} />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight heading-tight">
                Order Direct.{' '}
                <span className="inline-block" style={{ color: "var(--primary)" }}>
                  Save Big.
                </span>
              </h1>
              <p className="mb-6 text-base" style={{ color: "var(--text-secondary)" }}>
                No aggregator markups. Just great food at the best prices — directly from the restaurant.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 hover:shadow-lg shadow-glow"
                style={{ background: "var(--primary)" }}
              >
                Login to Order
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Logged-in welcome strip */}
        {user && (
          <section className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-extrabold heading-tight">
                  Welcome back!
                </h1>
                <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
                  Ready to order? Your favorites are waiting.
                </p>
              </div>
            </div>

            {/* Quick-action cards */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <Link
                href="/orders"
                className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
                  <Package className="w-5 h-5" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">My Orders</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>View history</p>
                </div>
              </Link>
              <Link
                href="/settings/notifications"
                className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,200,83,0.12)" }}>
                  <UtensilsCrossed className="w-5 h-5" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Food Preferences</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Manage settings</p>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Restaurant Listing */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold heading-tight">
              {user ? "Restaurants Near You" : "Available Restaurants"}
            </h2>
          </div>
          <RestaurantList />
        </section>
      </main>

      <Footer />
      <BottomNav />
      <FloatingCartButton />
    </div>
  );
}