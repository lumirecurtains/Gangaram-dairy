"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/contexts";
import { useRouter } from "next/navigation";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  collection, query, where, orderBy, limit, getDocs, startAfter,
  doc, writeBatch, deleteDoc, onSnapshot, updateDoc,
} from "firebase/firestore";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { NotificationCard } from "@/lib/components/notification/NotificationCard";
import { Loader2, Bell, BellOff, CheckCheck, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { showToast } from "@/lib/components/common/Toast";

interface NotificationDoc {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: any;
}

const PAGE_SIZE = 20;

export default function NotificationCenterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/notifications");
    }
  }, [user, authLoading, router]);

  const fetchNotifications = useCallback(async (isLoadMore = false) => {
    if (!user) return;
    try {
      const db = getFirebaseFirestore();
      let q = query(
        collection(db, "notifications", user.uid, "items"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      if (isLoadMore && lastDoc) {
        q = query(
          collection(db, "notifications", user.uid, "items"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }
      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationDoc);
      if (isLoadMore) {
        setNotifications((prev) => [...prev, ...fetched]);
      } else {
        setNotifications(fetched);
      }
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err: any) {
      showToast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, lastDoc]);

  // Real-time listener for new notifications (re-fetches on any change)
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, () => {
      setRefreshKey((k) => k + 1);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      setNotifications([]);
      setLastDoc(null);
      setHasMore(true);
      fetchNotifications();
    }
  }, [user, refreshKey]);

  const handleMarkRead = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const db = getFirebaseFirestore();
      const ref = doc(db, "notifications", user.uid, "items", id);
      await updateDoc(ref, { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      // Silently fail
    }
  }, [user]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    setMarkingAll(true);
    try {
      const db = getFirebaseFirestore();
      const q = query(
        collection(db, "notifications", user.uid, "items"),
        where("read", "==", false),
        limit(100)
      );
      const snap = await getDocs(q);
      if (snap.empty) { setMarkingAll(false); return; }
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast("All notifications marked as read", "success");
    } catch (err: any) {
      showToast("Failed to mark all as read", "error");
    } finally {
      setMarkingAll(false);
    }
  }, [user]);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const db = getFirebaseFirestore();
      await deleteDoc(doc(db, "notifications", user.uid, "items", id));
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      showToast("Failed to delete notification", "error");
    }
  }, [user]);

  // Group by date
  const groupedNotifications = (() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);

    const groups: { label: string; items: NotificationDoc[] }[] = [];

    const todayItems = notifications.filter((n) => {
      const d = n.createdAt?.toDate ? n.createdAt.toDate() : new Date((n.createdAt?.seconds || 0) * 1000);
      return d >= today;
    });
    if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });

    const yesterdayItems = notifications.filter((n) => {
      const d = n.createdAt?.toDate ? n.createdAt.toDate() : new Date((n.createdAt?.seconds || 0) * 1000);
      return d >= yesterday && d < today;
    });
    if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems });

    const olderItems = notifications.filter((n) => {
      const d = n.createdAt?.toDate ? n.createdAt.toDate() : new Date((n.createdAt?.seconds || 0) * 1000);
      return d < yesterday;
    });
    if (olderItems.length > 0) groups.push({ label: "Older", items: olderItems });

    return groups;
  })();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:opacity-80 active:scale-[0.98]" style={{ color: "var(--text-secondary)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold heading-tight">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--accent-light)", color: "var(--accent)" }}
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && notifications.length === 0 && (
          <div className="text-center py-20">
            <BellOff className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2 heading-tight">No notifications yet</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              You&apos;ll see updates about your orders here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-[0.98]"
              style={{ background: "var(--primary)" }}
            >
              Browse Restaurants
            </Link>
          </div>
        )}

        {/* Notifications list */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-bold mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.items.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMarkRead={handleMarkRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={() => {
                    setLoadingMore(true);
                    fetchNotifications(true);
                  }}
                  disabled={loadingMore}
                  className="px-8 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </span>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}