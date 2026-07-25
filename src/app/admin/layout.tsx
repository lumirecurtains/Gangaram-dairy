"use client";

import { WithRoleGuard } from "@/lib/components/auth/WithRoleGuard";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <WithRoleGuard routeType="admin">
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        {pathname !== "/admin" && (
          <div className="max-w-6xl mx-auto w-full px-4 pt-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Admin Hub
            </Link>
          </div>
        )}
        {children}
      </div>
    </WithRoleGuard>
  );
}
