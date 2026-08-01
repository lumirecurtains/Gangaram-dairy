"use client";

import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { CrossBranchComparisonReport } from "@/lib/components/analytics/CrossBranchComparisonReport";
import { CustomerBehaviorInsights } from "@/lib/components/analytics/CustomerBehaviorInsights";
import { Shield, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminAnalyticsPage() {
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

        <CrossBranchComparisonReport />

        <hr className="border-surface-border my-8" />

        <CustomerBehaviorInsights />
      </main>

      <Footer />
    </>
  );
}
