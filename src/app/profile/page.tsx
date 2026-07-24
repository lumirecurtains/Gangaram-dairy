"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { useAuth, useTheme } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { showToast } from "@/lib/components/common/Toast";
import { User, LogOut, Moon, Sun, Save, Loader2, Package, Bell, ChevronRight, MapPin } from "lucide-react";
import { AddressForm } from "@/lib/components/address/AddressForm";
import Link from "next/link";

export default function ProfilePage() {
  const { user, claims, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const db = getFirebaseFirestore();
      getDoc(doc(db, "users", user.uid))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setName(data.name || "");
            setAddress(data.address || "");
          }
        })
        .catch(() => showToast("Failed to load profile", "error"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const db = getFirebaseFirestore();
      await setDoc(doc(db, "users", user.uid), { name, address }, { merge: true });
      showToast("Profile updated!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <User className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">Login to view profile</h2>
            <Link href="/login" className="text-sm font-medium" style={{ color: "var(--primary)" }}>Go to login</Link>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>

        {/* User Info Card */}
        <div className="flex items-center gap-4 p-5 rounded-xl mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            {name?.charAt(0)?.toUpperCase() || user.phoneNumber?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate">{name || "User"}</p>
            <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{user.phoneNumber}</p>
            {(claims as any)?.role && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                {(claims as any).role}
              </span>
            )}
          </div>
        </div>

        {/* Edit Profile Section */}
        <div className="rounded-xl p-5 mb-4 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold">Edit Profile</h3>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Your Name
            </label>
            <input
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-xl text-sm outline-none transition-all focus:border-[var(--primary)]"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </div>

          <div className="border-t pt-4 mt-2" style={{ borderColor: "var(--border)" }}>
            <AddressForm
              initial={{
                flat: address,
                street: "",
                city: "",
                pincode: "",
                landmark: "",
              }}
              onSave={async (addr) => {
                const full = [addr.flat, addr.street, addr.city, addr.pincode, addr.landmark].filter(Boolean).join(", ");
                setAddress(full);
                showToast("Address saved!", "success");
              }}
              title="Delivery Address"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>

        {/* Quick Links */}
        <div className="space-y-2 mb-6">
          <Link
            href="/orders"
            className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.01] hover:shadow-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
              <Package className="w-5 h-5" style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">My Orders</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>View order history and reorder</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </Link>

          <Link
            href="/settings/notifications"
            className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.01] hover:shadow-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,200,83,0.12)" }}>
              <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Notification Settings</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Manage alerts and preferences</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </Link>
        </div>

        {/* Appearance */}
        <div className="rounded-xl p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold mb-3">Appearance</h3>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full py-3 px-4 rounded-xl hover:opacity-80 transition-all"
            style={{ background: "var(--bg)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme === "dark" ? "rgba(255,179,0,0.15)" : "rgba(26,26,46,0.1)" }}>
                {theme === "dark" ? <Sun className="w-4 h-4" style={{ color: "var(--warning)" }} /> : <Moon className="w-4 h-4" style={{ color: "var(--secondary)" }} />}
              </div>
              <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>
              {theme === "dark" ? "Switch" : "Switch"}
            </span>
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02] hover:shadow-sm"
          style={{ color: "var(--error)", background: "var(--error-light)", border: "1px solid rgba(244,67,54,0.2)" }}
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
