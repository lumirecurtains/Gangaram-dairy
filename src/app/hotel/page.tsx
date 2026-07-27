"use client";

import { Building2, LayoutDashboard, AlertCircle } from "lucide-react";

export default function HotelDashboardPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7" style={{ color: "var(--accent)" }} />
          Dashboard Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Welcome to the Hotel Admin panel. This space allows centralized control of your branches.
        </p>
      </div>

      <div className="p-6 rounded-xl border flex flex-col items-center justify-center text-center bg-blue-50/50 border-blue-200 min-h-[300px]">
        <Building2 className="w-16 h-16 text-blue-400 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-blue-900 mb-2">Foundation Complete</h2>
        <p className="max-w-md text-sm text-blue-700">
          The routing, navigation, and RBAC isolation for the Hotel Admin portal are fully active. 
          Data fetching, metric aggregation, and live reporting will be integrated in a future phase.
        </p>
      </div>
    </div>
  );
}
