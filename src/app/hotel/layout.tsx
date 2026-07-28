"use client";

import { WithRoleGuard } from "@/lib/components/auth/WithRoleGuard";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import {
  LayoutDashboard,
  Store,
  MenuSquare,
  Package,
  Users,
  LineChart,
  Tag,
  Star,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Megaphone
} from "lucide-react";
import { useState } from "react";

const sidebarLinks = [
  { href: "/hotel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hotel/branch", label: "Branch Management", icon: Store },
  { href: "/hotel/menu", label: "Menu Editor", icon: MenuSquare },
  { href: "/hotel/orders", label: "Order History", icon: Package },
  { href: "/hotel/marketing", label: "Marketing Center", icon: Megaphone },
  { href: "/hotel/staff", label: "Staff Directory", icon: Users },
  { href: "/hotel/analytics", label: "Analytics", icon: LineChart },
  { href: "/hotel/coupons", label: "Coupons", icon: Tag },
  { href: "/hotel/reviews", label: "Reviews", icon: Star },
  { href: "/hotel/notifications", label: "Notifications", icon: Bell },
  { href: "/hotel/settings", label: "Settings", icon: Settings },
];

export default function HotelAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <WithRoleGuard routeType="hotel">
      <div className="min-h-screen bg-[var(--bg)] flex flex-col md:flex-row">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-50">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--accent)" }}>
              H
            </div>
            <span>Hotel Admin</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? "fixed inset-0 z-40 pt-16" : "hidden"
          } md:block md:w-64 flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col`}
        >
          {/* Desktop Logo */}
          <div className="hidden md:flex items-center gap-3 p-6 border-b border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: "var(--accent)" }}>
              H
            </div>
            <span className="font-bold text-lg">Hotel Admin</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "bg-[rgba(0,200,83,0.1)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </WithRoleGuard>
  );
}
