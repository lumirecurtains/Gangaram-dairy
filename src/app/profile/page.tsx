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
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseFirestore();
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setName(snap.data().name || "");
      }
      setLoaded(true);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      showToast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const db = getFirebaseFirestore();
      await setDoc(doc(db, "users", user.uid), { name: name.trim() }, { merge: true });
      showToast("Profile updated", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24 flex items-center justify-center">
          <div className="text-center">
            <User className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2 heading-tight">Sign in to view profile</h2>
            <Link
              href="/login?redirect=/profile"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 active:scale-[0.98] mt-4"
              style={{ background: "var(--primary)" }}
            >
              Login
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-2xl font-bold">{(user.displayName || user.phoneNumber || "U")[0].toUpperCase()}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold heading-tight">{user.displayName || "Customer"}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{user.phoneNumber}</p>
        </div>

        {/* Saved Addresses (Phase 1) */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: "var(--primary)" }} />
              <h2 className="font-bold">Saved Addresses</h2>
            </div>
            <AddressForm onSave={() => {}} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage your delivery addresses
          </p>
        </div>

        {/* Profile Name */}
        <div className="rounded-xl p-5 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="font-bold mb-4">Profile Information</h2>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full p-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                border: `1px solid ${!name.trim() && loaded ? "var(--error)" : "var(--border)"}`,
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
              onBlur={(e) => e.target.style.borderColor = !name.trim() && loaded ? "var(--error)" : "var(--border)"}
              aria-invalid={!name.trim() && loaded}
            />
            {!name.trim() && loaded && (
              <p className="text-xs" style={{ color: "var(--error)" }}>Name is required</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 mt-2"
              style={{ background: "var(--primary)" }}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2 mb-4">
          <Link href="/orders" className="flex items-center justify-between w-full py-3 px-4 rounded-xl hover:opacity-80 transition-all" style={{ background: "var(--bg)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,87,34,0.12)" }}>
                <Package className="w-4 h-4" style={{ color: "var(--primary)" }} />
              </div>
              <span className="text-sm font-medium">My Orders</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </Link>
          <Link href="/notifications" className="flex items-center justify-between w-full py-3 px-4 rounded-xl hover:opacity-80 transition-all" style={{ background: "var(--bg)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,200,83,0.12)" }}>
                <Bell className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </Link>
          <Link href="/settings/notifications" className="flex items-center justify-between w-full py-3 px-4 rounded-xl hover:opacity-80 transition-all" style={{ background: "var(--bg)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,179,0,0.15)" }}>
                <Bell className="w-4 h-4" style={{ color: "var(--warning)" }} />
              </div>
              <span className="text-sm font-medium">Notification Settings</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </Link>
        </div>

        {/* Theme Toggle (P2 item 20: dynamic label) */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full py-3 px-4 rounded-xl hover:opacity-80 transition-all mb-4"
          style={{ background: "var(--bg)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme === "dark" ? "rgba(255,179,0,0.15)" : "rgba(26,26,46,0.1)" }}>
              {theme === "dark" ? <Sun className="w-4 h-4" style={{ color: "var(--warning)" }} /> : <Moon className="w-4 h-4" style={{ color: "var(--secondary)" }} />}
            </div>
            <span className="text-sm font-medium">{theme === "dark" ? "Enable Light Mode" : "Enable Dark Mode"}</span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        {/* Role Badge */}
        {claims?.role && claims.role !== "customer" && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="text-sm font-semibold capitalize" style={{ color: "var(--text-secondary)" }}>
                {claims.role} access
              </span>
            </div>
            {claims.role === "admin" && (
              <Link href="/admin" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                Go to Admin Panel →
              </Link>
            )}
            {claims.role === "merchant" && (
              <Link href="/kitchen" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                Go to Kitchen Dashboard →
              </Link>
            )}
            {claims.role === "driver" && (
              <Link href="/driver" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                Go to Driver Dashboard →
              </Link>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "var(--error)" }}
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}