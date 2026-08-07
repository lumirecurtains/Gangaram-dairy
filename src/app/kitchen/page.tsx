"use client";

import { useAuth } from "@/lib/contexts";
import { OrderQueue } from "@/lib/components/kitchen/OrderQueue";
import { AvailabilityGrid } from "@/lib/components/kitchen/AvailabilityGrid";
import { Loader2, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WithRoleGuard } from "@/lib/components/auth/WithRoleGuard";

export default function KitchenDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "menu">("orders");
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);

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
    <div className={`h-full flex flex-col ${isHighContrast ? "bg-black text-white" : ""}`}>
      <div className="mb-6 flex-shrink-0 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className={`text-2xl font-extrabold mb-1 ${isHighContrast ? "text-yellow-400 font-mono" : ""}`}>
            Kitchen Dashboard
          </h2>
          <p style={{ color: isHighContrast ? "#cbd5e1" : "var(--text-secondary)" }}>
            {activeTab === "orders" ? "Manage incoming orders in real-time." : "Manage menu item availability."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* High Contrast Mode Toggle */}
          <button
            onClick={() => setIsHighContrast((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isHighContrast
                ? "bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/30"
                : "bg-surface border-surface-border text-text-secondary hover:text-text-primary"
            }`}
            title="Toggle Ultra-High-Contrast Kitchen Display Mode"
          >
            {isHighContrast ? <Sun className="w-4 h-4 text-black" /> : <Moon className="w-4 h-4 text-amber-400" />}
            High Contrast
          </button>

          {/* Tab Switcher */}
          <div className="flex bg-[var(--surface)] p-1 rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "orders" ? "shadow-sm" : ""
              }`}
              style={{
                background: activeTab === "orders" ? "var(--bg)" : "transparent",
                color: activeTab === "orders" ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              Live Orders
            </button>
            <button
              onClick={() => setActiveTab("menu")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "menu" ? "shadow-sm" : ""
              }`}
              style={{
                background: activeTab === "menu" ? "var(--bg)" : "transparent",
                color: activeTab === "menu" ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              Menu Availability
            </button>
          </div>
        </div>
      </div>

      {activeTab === "orders" ? (
        <OrderQueue isHighContrast={isHighContrast} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <AvailabilityGrid />
        </div>
      )}
    </div>
  );
}
