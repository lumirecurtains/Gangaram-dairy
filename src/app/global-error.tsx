"use client";

import { Inter } from "next/font/google";
import { AlertCircle } from "lucide-react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4 opacity-80" />
        <h2 className="text-2xl font-bold mb-2 heading-tight">Critical Error</h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md">
          A critical system error occurred. We are working to fix it.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98] text-white"
          style={{ background: "var(--primary)" }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
