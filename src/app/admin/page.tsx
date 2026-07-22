"use client";

import { useAuth } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Shield,
  Settings,
  Flag,
  Bell,
  Wrench,
  Database,
  Users,
  ClipboardList,
  Clock,
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
    href: "/api/v1/admin/roles",
    label: "Role Management",
    description: "Assign and revoke admin, support, merchant, and rider roles",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/settings",
    label: "Platform Settings",
    description: "Update platform-wide configuration values",
    icon: <Settings className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/feature-flags",
    label: "Feature Flags",
    description: "Enable or disable platform features with rollout percentages",
    icon: <Flag className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/maintenance-mode",
    label: "Maintenance Mode",
    description: "Toggle maintenance mode and set display messages",
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/notifications",
    label: "Broadcast Notification",
    description: "Send platform-wide notifications to users",
    icon: <Bell className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/audit-logs",
    label: "Audit Logs",
    description: "View all admin actions and system events",
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/support-tickets",
    label: "Support Tickets",
    description: "Manage merchant support requests",
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/backups",
    label: "Backups &amp; Restore",
    description: "Export, restore, and manage database backups",
    icon: <Database className="w-5 h-5" />,
  },
  {
    href: "/api/v1/admin/migrations",
    label: "Migrations",
    description: "Track and log schema version migrations",
    icon: <Clock className="w-5 h-5" />,
  },
];

export default function AdminDashboardPage() {
  const { user, claims, loading: authLoading } = useAuth();
  const role = (claims as any)?.role;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!user || (role !== "super_admin" && role !== "support_agent")) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              This dashboard requires admin or support agent access.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105"
              style={{ background: "var(--primary)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Go Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full pb-12">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7" style={{ color: "var(--primary)" }} />
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage platform settings, users, and system operations
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
    </div>
  );
}
