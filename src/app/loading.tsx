import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--primary)" }} />
      </main>
      <Footer />
    </div>
  );
}
