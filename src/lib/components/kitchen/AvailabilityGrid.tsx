"use client";

import { useEffect, useState, useCallback } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { useAuth } from "@/lib/contexts";
import { Skeleton } from "@/lib/components/common/Skeleton";
import { showToast } from "@/lib/components/common/Toast";
import { Loader2, CircleCheck, CircleX, Leaf, Search } from "lucide-react";

interface MenuItemDoc {
  id: string;
  name: string;
  description: string;
  ourPrice: number;
  isAvailable: boolean;
  category: string;
  veg: boolean;
  sortOrder: number;
}

export function AvailabilityGrid() {
  const { user, claims } = useAuth();
  const merchantId = (claims as any)?.merchantId;
  const [items, setItems] = useState<MenuItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!merchantId) {
      setLoading(false);
      return;
    }

    const db = getFirebaseFirestore();
    const menuRef = collection(db, `merchants/${merchantId}/menus`);
    const q = query(menuRef, where("isAvailable", "in", [true, false]));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MenuItemDoc, "id">),
        })) as MenuItemDoc[];
        setItems(list.sort((a, b) => a.sortOrder - b.sortOrder));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load menu:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [merchantId]);

  const toggleAvailability = useCallback(
    async (itemId: string, currentAvailable: boolean) => {
      if (!merchantId) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, isAvailable: !currentAvailable } : i
        )
      );
      setTogglingIds((prev) => new Set(prev).add(itemId));

      try {
        const db = getFirebaseFirestore();
        await updateDoc(
          doc(db, `merchants/${merchantId}/menus/${itemId}`),
          { isAvailable: !currentAvailable }
        );
      } catch (err: any) {
        // Revert on failure
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, isAvailable: currentAvailable } : i
          )
        );
        showToast("Failed to update availability", "error");
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [merchantId]
  );

  const filtered = search
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const grouped = filtered.reduce<Record<string, MenuItemDoc[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Skeleton className="w-full h-24 rounded-lg mb-3" />
            <Skeleton className="w-3/4 h-4 rounded mb-2" />
            <Skeleton className="w-1/2 h-3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!merchantId) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">No merchant account linked to your profile.</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Contact admin to get merchant_staff access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-secondary)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu items..."
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <Leaf className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="font-medium">{search ? "No matching items" : "No menu items yet"}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="text-lg font-bold mb-3">{category}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoryItems.map((item) => {
                const isToggling = togglingIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleAvailability(item.id, item.isAvailable)}
                    disabled={isToggling}
                    className="relative flex flex-col items-center justify-center text-center p-4 rounded-xl min-h-[120px] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                    style={{
                      background: item.isAvailable
                        ? "var(--surface)"
                        : "var(--bg)",
                      border: `2px solid ${
                        item.isAvailable ? "var(--accent)" : "var(--border)"
                      }`,
                      opacity: item.isAvailable ? 1 : 0.6,
                    }}
                    aria-label={`${item.name}: ${item.isAvailable ? "Available" : "Unavailable"}. Click to toggle.`}
                  >
                    {isToggling && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(0,0,0,0.1)" }}>
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
                      </div>
                    )}
                    <div className="flex items-center gap-1 mb-2">
                      {item.veg ? (
                        <span className="w-3 h-3 rounded-sm border" style={{ borderColor: "var(--accent)" }}>
                          <span className="block w-1.5 h-1.5 rounded-sm mx-auto mt-0.5" style={{ background: "var(--accent)" }} />
                        </span>
                      ) : (
                        <span className="w-3 h-3 rounded-sm border" style={{ borderColor: "var(--error)" }}>
                          <span className="block w-1.5 h-1.5 rounded-sm mx-auto mt-0.5" style={{ background: "var(--error)" }} />
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm leading-tight mb-1">{item.name}</p>
                    <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      ₹{item.ourPrice}
                    </p>
                    <div
                      className="mt-2 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        background: item.isAvailable
                          ? "rgba(0,200,83,0.15)"
                          : "rgba(244,67,54,0.1)",
                        color: item.isAvailable ? "var(--accent)" : "var(--error)",
                      }}
                    >
                      {item.isAvailable ? (
                        <>
                          <CircleCheck className="w-3 h-3" /> Available
                        </>
                      ) : (
                        <>
                          <CircleX className="w-3 h-3" /> Unavailable
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
