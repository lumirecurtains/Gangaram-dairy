"use client";

import { Target, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CampaignsPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <Link
        href="/hotel/marketing"
        className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Marketing Center
      </Link>

      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Promotional Campaigns
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Schedule and manage seasonal campaigns and targeted marketing drives.
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold opacity-50 cursor-not-allowed"
          style={{ background: "var(--primary)" }}
          disabled
        >
          <Plus className="w-5 h-5" /> Create Campaign
        </button>
      </div>

      <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
          <Target className="w-8 h-8 opacity-50" />
        </div>
        <p className="font-bold text-lg mb-2">No campaigns created</p>
        <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
          The Campaign Engine is scheduled for a future release. You will be able to automate discounts and track conversion metrics here.
        </p>
      </div>
    </div>
  );
}
