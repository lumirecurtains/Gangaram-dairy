"use client";

import { useAuth } from "@/lib/contexts";
import { OrderQueue } from "@/lib/components/kitchen/OrderQueue";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WithRoleGuard } from "@/lib/components/auth/WithRoleGuard";

export default function KitchenDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && isClient) {
      router.push("/login?redirect=/kitchen");
    }
  }, [user, loading, router, isClient]);

  if (loading || !isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <WithRoleGuard routeType="kitchen">
      <div className="h-full flex flex-col">
        <div className="mb-6 flex-shrink-0">
          <h2 className="text-2xl font-extrabold mb-1">Live Dashboard</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Manage incoming orders in real-time.
          </p>
        </div>
        <OrderQueue />
      </div>
    </WithRoleGuard>
  );
}
