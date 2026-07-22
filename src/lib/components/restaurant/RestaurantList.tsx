"use client";

import { useEffect, useState } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit, type DocumentData } from "firebase/firestore";
import { RestaurantCard } from "./RestaurantCard";
import { RestaurantCardSkeleton } from "@/lib/components/common/Skeleton";
import { SearchBar } from "@/lib/components/common/SearchBar";
import { Store, AlertCircle } from "lucide-react";

interface StorefrontDoc {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  city: string;
  isOnline: boolean;
  cuisine?: string | null;
  openingHours?: string | null;
  priceForTwo?: number | null;
  promoBanner?: string | null;
  brandColor?: string | null;
}

export function RestaurantList() {
  const [restaurants, setRestaurants] = useState<StorefrontDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, "storefronts"),
      where("onboardingStatus", "==", "LIVE"),
      orderBy("updatedAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StorefrontDoc[];
      setRestaurants(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to load restaurants:", err);
      setLoading(false);
    });

    return unsub;
  }, []);

  const filtered = restaurants.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine?.toLowerCase().includes(search.toLowerCase()) ||
    r.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchBar value={search} onChange={setSearch} placeholder="Search restaurants or cuisines..." />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <h3 className="text-lg font-semibold mb-1">No restaurants found</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {search ? "Try a different search term" : "No restaurants available yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => (
            <RestaurantCard key={r.id} {...r} />
          ))}
        </div>
      )}
    </div>
  );
}
