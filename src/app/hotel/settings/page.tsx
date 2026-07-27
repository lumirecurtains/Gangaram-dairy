"use client";

import { Construction } from "lucide-react";

export default function PlaceholderPage() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center text-center">
      <Construction className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
      <h2 className="text-xl font-bold mb-2">Under Construction</h2>
      <p className="max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
        This module is currently part of the foundational rollout. Business logic, CRUD operations, and Firestore integration will be deployed in a future release phase.
      </p>
    </div>
  );
}
