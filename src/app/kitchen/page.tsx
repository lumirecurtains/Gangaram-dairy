"use client";

import { useAuth } from "@/lib/contexts";
import { OrderQueue } from "@/lib/components/kitchen/OrderQueue";
import { AvailabilityGrid } from "@/lib/components/kitchen/AvailabilityGrid";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WithRoleGuard } from "@/lib/components/auth/WithRoleGuard";

export default function KitchenDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "menu">("orders");

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
      <div className="h-full flex flex-col">
        <div className="mb-6 flex-shrink-0 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-extrabold mb-1">Kitchen Dashboard</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              {activeTab === "orders" ? "Manage incoming orders in real-time." : "Manage menu item availability."}
            </p>
          </div>
          <div className="flex bg-[var(--surface)] p-1 rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "orders" ? "shadow-sm" : ""}`}
              style={{ background: activeTab === "orders" ? "var(--bg)" : "transparent", color: activeTab === "orders" ? "var(--primary)" : "var(--text-secondary)" }}
            >
              Live Orders
            </button>
            <button
              onClick={() => setActiveTab("menu")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "menu" ? "shadow-sm" : ""}`}
              style={{ background: activeTab === "menu" ? "var(--bg)" : "transparent", color: activeTab === "menu" ? "var(--primary)" : "var(--text-secondary)" }}
            >
              Menu Availability
            </button>
          </div>
        </div>
        {activeTab === "orders" ? <OrderQueue /> : <div className="flex-1 overflow-y-auto"><AvailabilityGrid /></div>}
      </div>
  );
}
