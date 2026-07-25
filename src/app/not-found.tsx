import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4 opacity-80" />
        <h2 className="text-2xl font-bold mb-2 heading-tight">Page Not Found</h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md">
          We couldn't find the page you're looking for. It might have been removed or the URL might be incorrect.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90 active:scale-[0.98] text-white"
          style={{ background: "var(--primary)" }}
        >
          Return Home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
