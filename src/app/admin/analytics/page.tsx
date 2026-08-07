"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { useAuth } from "@/lib/contexts";
import { CrossBranchComparisonReport } from "@/lib/components/analytics/CrossBranchComparisonReport";
import { CustomerBehaviorInsights } from "@/lib/components/analytics/CustomerBehaviorInsights";
import { PlatformHealthInsights } from "@/lib/components/admin/PlatformHealthInsights";
import { Shield, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      user.getIdToken().then((t) => setToken(t)).catch(() => {});
    }
  }, [user]);

  return (
    <>
      <Navbar />

      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full pb-12 space-y-10">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Admin Platform
          </Link>
        </div>

        <CrossBranchComparisonReport authToken={token} />

        <hr className="border-surface-border my-8" />

        <CustomerBehaviorInsights authToken={token} />

        <hr className="border-surface-border my-8" />

        <PlatformHealthInsights />
      </main>

      <Footer />
    </>
  );
}
