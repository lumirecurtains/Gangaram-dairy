"use client";

import { WithRoleGuard } from "@/lib/components/auth/WithRoleGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WithRoleGuard routeType="admin">
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        {children}
      </div>
    </WithRoleGuard>
  );
}
