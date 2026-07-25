"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4 opacity-80" />
        <h2 className="text-2xl font-bold mb-2 heading-tight">Something went wrong!</h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md">
          We encountered an unexpected error. Please try again or return home.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98] text-white"
            style={{ background: "var(--primary)" }}
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 rounded-xl font-bold transition-all hover:bg-gray-100"
            style={{ border: "1px solid var(--border)" }}
          >
            Go Home
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
