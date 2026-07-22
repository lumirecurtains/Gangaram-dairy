"use client";

import { RiderProvider } from "@/lib/contexts";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Wrap the driver module in the RiderProvider to securely scope
    // API calls to the logged-in rider.
    <RiderProvider>
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        {/* We do NOT include the consumer BottomNav or Cart here */}
        <header className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <h1 className="text-xl font-bold" style={{ color: "var(--primary)" }}>Driver Dashboard</h1>
          {/* Module 8: Add user profile / logout button here */}
        </header>
        
        <main className="flex-1 p-4 md:p-6 overflow-hidden">
          {children}
        </main>
      </div>
    </RiderProvider>
  );
}
