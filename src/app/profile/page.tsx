"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { useAuth, useTheme } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { showToast } from "@/lib/components/common/Toast";
import { User, LogOut, Moon, Sun, Save, Loader2, Package } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, claims, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const db = getFirebaseFirestore();
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || "");
          setAddress(data.address || "");
        }
      });
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>

        {/* User Info */}
        <div className="flex items-center gap-4 p-4 rounded-xl mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: "var(--primary)" }}>
            {name?.charAt(0)?.toUpperCase() || user.phoneNumber?.charAt(1) || "U"}
          </div>
          <div>
            <p className="font-bold text-lg">{name || "User"}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{user.phoneNumber}</p>
            {(claims as any)?.role && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                {(claims as any).role}
              </span>
            )}
          </div>
        </div>

        {/* Edit Profile */}
        <div className="rounded-xl p-4 mb-4 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold">Edit Profile</h3>
          <input
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <input
            placeholder="Delivery Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>

        {/* Settings */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-bold mb-3">Settings</h3>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full py-3 px-3 rounded-xl hover:opacity-80 transition-opacity"
            style={{ background: "var(--bg)" }}
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Toggle</span>
          </button>
        </div>

        {/* My Orders */}
        <Link
          href="/orders"
          className="flex items-center gap-3 p-4 rounded-xl mb-4 hover:opacity-80 transition-opacity"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Package className="w-5 h-5" style={{ color: "var(--primary)" }} />
          <div>
            <p className="font-semibold text-sm">My Orders</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>View order history</p>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02]"
          style={{ color: "var(--error)", background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.2)" }}
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}