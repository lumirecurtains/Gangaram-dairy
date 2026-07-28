"use client";

import { Megaphone, Image as ImageIcon, Sparkles, Target, Settings, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function MarketingDashboardPage() {
  const modules = [
    {
      title: "Hero Banners",
      description: "Manage the primary promotional banners displayed at the top of your restaurant page.",
      icon: ImageIcon,
      href: "/hotel/marketing/banners",
      status: "No Marketing Content Yet"
    },
    {
      title: "Featured Sections",
      description: "Highlight top-selling items, chef's specials, or new arrivals.",
      icon: Sparkles,
      href: "/hotel/marketing/featured",
      status: "No Marketing Content Yet"
    },
    {
      title: "Promotional Campaigns",
      description: "Schedule and manage seasonal campaigns and targeted marketing drives.",
      icon: Target,
      href: "/hotel/marketing/campaigns",
      status: "No Marketing Content Yet"
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" style={{ color: "var(--primary)" }} />
          Marketing Center
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Control the visual merchandising and promotional campaigns for your branch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <Link
            key={mod.title}
            href={mod.href}
            className="group flex flex-col p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-[var(--primary-light)]" style={{ background: "var(--bg)", color: "var(--primary)" }}>
              <mod.icon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold mb-2">{mod.title}</h2>
            <p className="text-sm flex-1 mb-4" style={{ color: "var(--text-secondary)" }}>
              {mod.description}
            </p>
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {mod.status}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-500 flex-shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">Homepage Layout Configuration</h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Enable or disable marketing sections directly from the Branch Management settings.
            </p>
          </div>
        </div>
        <Link 
          href="/hotel/branch"
          className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 whitespace-nowrap"
          style={{ background: "var(--primary)" }}
        >
          Configure Layout
        </Link>
      </div>
    </div>
  );
}
