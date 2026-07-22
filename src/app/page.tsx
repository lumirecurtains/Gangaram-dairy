"use client";

import { useAuth } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { RestaurantList } from "@/lib/components/restaurant/RestaurantList";
import { FloatingCartButton } from "@/lib/components/cart/FloatingCartButton";
import { Loader2, Store } from "lucide-react";
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
          <section className="mb-10 text-center py-10 px-4 rounded-2xl relative overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(circle at 50% 50%, var(--primary) 0%, transparent 70%)" }} />
            <div className="relative">
              <Store className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--primary)" }} />
              <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
                Order Direct. <span style={{ color: "var(--primary)" }}>Save Big.</span>
              </h1>
              <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
                No aggregator markups. Just great food at the best prices.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 shadow-glow"
                style={{ background: "var(--primary)" }}
              >
                Login to Order
              </Link>
            </div>
          </section>
        )}

        {/* Logged in welcome */}
        {user && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p style={{ color: "var(--text-secondary)" }}>Hungry? Let&apos;s find you something good.</p>
          </div>
        )}

        {/* Restaurant Listing */}
        <RestaurantList />
      </main>

      <Footer />
      <BottomNav />
      <FloatingCartButton />
    </div>
  );
}
