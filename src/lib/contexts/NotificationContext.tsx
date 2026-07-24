"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { useAuth } from "@/lib/contexts";

interface NotificationContextType {
  unreadCount: number;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  loading: true,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Skip local mutations to avoid double-counting during mark-read
        if (snap.metadata.hasPendingWrites) return;
        setUnreadCount(snap.docs.length);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, loading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
