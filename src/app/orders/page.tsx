"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";
import { Order } from "@/lib/firestoreSchema";
import { CustomerOrderCard } from "@/lib/components/order/CustomerOrderCard";
import { SearchBar } from "@/lib/components/common/SearchBar";
import { FilterChips } from "@/lib/components/common/FilterChips";
import { Loader2, PackageX, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { showToast } from "@/lib/components/common/Toast";

type FilterStatus = "All" | "Active" | "Completed" | "Pending Payment" | "Cancelled";

const FILTER_OPTIONS: FilterStatus[] = ["All", "Active", "Completed", "Pending Payment", "Cancelled"];

const STATUS_MAP: Record<FilterStatus, string[]> = {
  "All": [],
  "Active": ["pending_payment", "paid", "preparing", "ready", "out_for_delivery"],
  "Completed": ["delivered"],
  "Pending Payment": ["pending_payment", "payment_failed"],
  "Cancelled": ["cancelled", "refunded"],
};

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("All");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/orders");
    }
  }, [user, authLoading, router]);

  const fetchOrders = async (isLoadMore = false) => {
    if (!user) return;
    try {
      const db = getFirebaseFirestore();
      let q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      if (isLoadMore && lastDoc) {
        q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order & { id: string }));

      if (isLoadMore) {
        setOrders((prev) => [...prev, ...fetched]);
      } else {
        setOrders(fetched);
      }

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 20);
    } catch (err: any) {
      showToast(err.message || "Failed to load orders", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      setOrders([]);
      setLastDoc(null);
      setHasMore(true);
      fetchOrders();
    }
  }, [user]);

  // Client-side filtering by status + search
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Status filter
    const allowedStatuses = STATUS_MAP[statusFilter];
    if (allowedStatuses && allowedStatuses.length > 0) {
      result = result.filter((o) => allowedStatuses.includes(o.status));
    }

    // Search filter — matches order ID (last 8 chars or full) and item names
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(term) ||
          o.items.some((item) => item.name.toLowerCase().includes(term))
      );
    }

    return result;
  }, [orders, statusFilter, search]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile" className="p-2 rounded-lg hover:opacity-80 active:scale-[0.98]" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold heading-tight">My Orders</h1>
        </div>

        {/* Search */}
        <div className="mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by order ID or item name..."
          />
        </div>

        {/* Filter chips */}
        <div className="mb-6">
          <FilterChips
            options={FILTER_OPTIONS}
            selected={statusFilter}
            onSelect={(val) => setStatusFilter(val as FilterStatus)}
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        )}

        {/* Orders list */}
        {!loading && (
          <>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20">
                <PackageX className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: "var(--text-secondary)" }} />
                <h2 className="text-xl font-bold mb-2 heading-tight">
                  {orders.length === 0 ? "No orders yet" : "No matching orders"}
                </h2>
                <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
                  {orders.length === 0
                    ? "Your order history will appear here."
                    : "Try changing the filter or search term."}
                </p>
                {orders.length === 0 ? (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-[0.98]"
                    style={{ background: "var(--primary)" }}
                  >
                    Browse Menu
                  </Link>
                ) : (
                  <button
                    onClick={() => { setStatusFilter("All"); setSearch(""); }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-[0.98]"
                    style={{ background: "var(--primary)" }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <CustomerOrderCard key={order.id} order={order} />
                ))}

                {/* Load More */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => {
                        setLoadingMore(true);
                        fetchOrders(true);
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
          </>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}