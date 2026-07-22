"use client";

import Link from "next/link";
import { Store } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto px-4 py-8 text-center text-sm" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold" style={{ color: "var(--text)" }}>
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--primary)" }}>G</div>
          Gangaram
        </Link>
        <p>© 2026 Gangaram. Order direct, save on fees.</p>
      </div>
    </footer>
  );
}
