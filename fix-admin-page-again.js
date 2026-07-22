const fs = require('fs');

const file = `"use client";

import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import {
  Shield,
  Settings,
  Flag,
  Bell,
  Wrench,
  Database,
  Users,
  ClipboardList,
  Clock,
  Store,
  Bike,
  Star
} from "lucide-react";
import Link from "next/link";

interface AdminLink {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const adminLinks: AdminLink[] = [
  {
    href: "/admin/roles",
    label: "Role Management",
    description: "Assign and revoke admin, support, merchant, and rider roles",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    href: "/admin/merchants",
    label: "Merchants",
    description: "Approve, suspend, and manage all restaurants",
    icon: <Store className="w-5 h-5" />,
  },
  {
    href: "/admin/orders",
    label: "Live Orders",
    description: "Global oversight of all active platform orders",
    icon: <Bike className="w-5 h-5" />,
  },
  {
    href: "/admin/reviews",
    label: "Review Moderation",
    description: "Approve or reject customer restaurant reviews",
    icon: <Star className="w-5 h-5" />,
  },
  {
    href: "/admin/coupons",
    label: "Coupons & Loyalty",
    description: "Manage global platform coupons and loyalty points",
    icon: <Store className="w-5 h-5" />,
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    description: "View all secure admin actions and system events",
    icon: <ClipboardList className="w-5 h-5" />,
  },
];

export default function AdminDashboardPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full pb-12">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7" style={{ color: "var(--primary)" }} />
            Super Admin Platform
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Global oversight and access management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block p-5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--primary-light)", color: "var(--primary)" }}
              >
                {link.icon}
              </div>
              <h3 className="font-semibold mb-1">{link.label}</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
`;

fs.writeFileSync('src/app/admin/page.tsx', file);
