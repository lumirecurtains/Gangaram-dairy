"use client";

import { useEffect, useState } from "react";
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

type FilterStatus = "All" | "Active" | "Completed" | "Cancelled";

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("All");

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
      const fetchedOrders = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Order) }));

      if (isLoadMore) {
        setOrders(prev => [...prev, ...fetchedOrders]);
      } else {
        setOrders(fetchedOrders);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchOrders(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!user) return null;

  // Local filtering
  const filteredOrders = orders.filter(order => {
    // Status filter
    const s = order.status as string;
    const isCancelled = s === "cancelled" || s === "refunded" || s === "payment_failed";
    const isActive = !isCancelled && s !== "delivered";
    const isCompleted = s === "delivered";

    if (statusFilter === "Active" && !isActive) return false;
    if (statusFilter === "Completed" && !isCompleted) return false;
    if (statusFilter === "Cancelled" && !isCancelled) return false;

    // Search filter (id or item name)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchesId = order.id.toLowerCase().includes(q);
      const matchesItem = order.items.some(item => item.name.toLowerCase().includes(q));
      if (!matchesId && !matchesItem) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile" className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">My Orders</h1>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder="Search by item name or Order ID..." 
          />
          <FilterChips 
            options={["All", "Active", "Completed", "Cancelled"]} 
            selected={statusFilter} 
            onSelect={(val) => setStatusFilter(val || "All")} 
          />
        </div>

        {/* List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 border rounded-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <PackageX className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h3 className="text-xl font-bold mb-2">No orders found</h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {search || statusFilter !== "All" 
                ? "Try adjusting your filters" 
                : "You haven't placed any orders yet."}
            </p>
            {(!search && statusFilter === "All") && (
              <Link 
                href="/" 
                className="inline-block px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105"
                style={{ background: "var(--primary)" }}
              >
                Browse Restaurants
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <CustomerOrderCard key={order.id} order={order} />
            ))}
            
            {hasMore && (
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-4 mt-2 rounded-xl font-bold transition-all border disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--primary)", background: "var(--surface)" }}
              >
                {loadingMore ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Load More"}
              </button>
            )}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
