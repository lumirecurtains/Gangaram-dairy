"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, Bell, ArrowLeft } from "lucide-react";
import Link from "next/link";

const DEFAULT_PREFS = {
  orderUpdates: true,
  paymentAlerts: true,
  offers: true,
  marketing: false,
};

export default function NotificationSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/settings/notifications");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      try {
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, "notificationPreferences", user.uid));
        if (snap.exists()) {
          setPrefs({ ...DEFAULT_PREFS, ...snap.data() });
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    };
    loadPrefs();
  }, [user]);

  const handleToggle = async (key: keyof typeof DEFAULT_PREFS) => {
    if (!user) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      const db = getFirebaseFirestore();
      await setDoc(doc(db, "notificationPreferences", user.uid), updated, { merge: true });
    } catch {
      setPrefs(prefs); // Revert on failure
      showToast("Failed to update preference", "error");
    } finally {
      setSaving(false);
    }
  };

  const settings: Array<{ key: keyof typeof DEFAULT_PREFS; label: string; description: string }> = [
    { key: "orderUpdates", label: "Order Updates", description: "Order status changes, delivery updates" },
    { key: "paymentAlerts", label: "Payment Alerts", description: "Payment success, failure, refunds" },
    { key: "offers", label: "Offers & Promotions", description: "Discounts, coupons, special deals" },
    { key: "marketing", label: "Marketing", description: "Newsletters, new features, announcements" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile" className="p-2 rounded-lg hover:opacity-80 active:scale-[0.98]" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold heading-tight">Notification Settings</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : (
          <div className="space-y-3">
            {settings.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {s.description}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(s.key)}
                  disabled={saving}
                  className="relative w-12 h-6 rounded-full transition-all"
                  style={{
                    background: prefs[s.key] ? "var(--accent)" : "var(--border)",
                  }}
                  role="switch"
                  aria-checked={prefs[s.key]}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      transform: prefs[s.key] ? "translateX(24px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}