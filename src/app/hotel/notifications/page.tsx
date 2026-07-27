"use client";

import { useEffect, useState, useCallback } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, startAfter, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/contexts";
import { useMerchant } from "@/lib/contexts/MerchantContext";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, Bell, CheckCircle, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface NotificationDoc {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  metadata?: any;
  createdAt: { toDate: () => Date } | { _seconds: number } | any;
}

const PAGE_SIZE = 20;

export default function HotelNotificationsPage() {
  const { user } = useAuth();
  const { merchantId } = useMerchant();

  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // Since Hotel Admins receive notifications strictly mapped to their personal UID
  // (e.g. they are the target of merchant-level notifications via their role assignment),
  // we reuse the same collection path `notifications/{uid}/items` as the base consumer platform.
  // The backend dispatchers ensure `isHotelAdmin` users receive merchant alerts here.

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

      // We filter natively on the client to ensure we only show notifications 
      // relevant to this explicit merchantId, guaranteeing Cross-branch protection
      // if a user somehow holds multi-merchant claims in the future.
      const branchFiltered = fetched.filter(n => n.metadata?.merchantId === merchantId || !n.metadata?.merchantId);

      if (isLoadMore) {
        setNotifications((prev) => {
          const combined = [...prev, ...branchFiltered];
          // deduplicate
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
      } else {
        setNotifications(branchFiltered);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, lastDoc, merchantId]);

  useEffect(() => {
    if (!user) return;
    
    // Initial fetch
    fetchNotifications();

    // Soft realtime listener just on the most recent item to trigger a re-fetch
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      // If a new doc appears that wasn't in our list
      if (!snap.empty && notifications.length > 0) {
        const newestId = snap.docs[0].id;
        if (newestId !== notifications[0].id) {
          fetchNotifications();
        }
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getIconForType = (type: string) => {
    if (type.includes("order")) return <AlertCircle className="w-5 h-5" style={{ color: "var(--primary)" }} />;
    if (type.includes("success")) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (type.includes("fail") || type.includes("cancel")) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    return <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} /></div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" style={{ color: "var(--primary)" }} />
            Branch Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Operational alerts and updates for your restaurant.
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="font-medium text-lg">No notifications yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>We'll alert you when there's activity.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const date = notif.createdAt?.toDate ? notif.createdAt.toDate() : 
                         notif.createdAt?._seconds ? new Date(notif.createdAt._seconds * 1000) : 
                         new Date();

            return (
              <div key={notif.id} className={`p-4 rounded-xl border transition-all ${!notif.read ? 'bg-gray-50' : 'bg-[var(--surface)]'}`} style={{ borderColor: "var(--border)" }}>
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {getIconForType(notif.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm ${!notif.read ? 'font-bold' : 'font-semibold'}`}>
                      {notif.title}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{notif.body}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {date.toLocaleString()}
                      </span>
                      {notif.link && (
                        <Link href={notif.link} className="text-xs font-bold hover:underline" style={{ color: "var(--primary)" }}>
                          View Details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {hasMore && (
            <button
              onClick={() => fetchNotifications(true)}
              disabled={loadingMore}
              className="w-full py-3 mt-4 rounded-lg font-bold border transition-all hover:bg-gray-50"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {loadingMore ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Load More"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
