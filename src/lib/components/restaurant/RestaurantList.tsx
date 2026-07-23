"use client";

import { useEffect, useState } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit, type DocumentData } from "firebase/firestore";
import { RestaurantCard } from "./RestaurantCard";
import { useAuth } from "@/lib/contexts";
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
  const [menuSearchData, setMenuSearchData] = useState<{merchantId: string, name: string}[] | null>(null);

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

  useEffect(() => {
    // Only fetch if we have restaurants and haven't fetched the menu index yet
    if (restaurants.length > 0 && !menuSearchData) {
      const merchantIds = restaurants.map(r => r.merchantId || r.id);
      fetch("/api/v1/search/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantIds })
      })
      .then(res => res.json())
      .then(data => {
        if (data.menus) setMenuSearchData(data.menus);
      })
      .catch(err => console.error("Search index error:", err));
    }
  }, [restaurants, menuSearchData]);

  const cleanSearch = search.trim().toLowerCase();

  const filtered = restaurants.map((r) => {
    const matchesName = r.name?.toLowerCase().includes(cleanSearch);
    const matchesCuisine = r.cuisine?.toLowerCase().includes(cleanSearch);
    const matchesCity = r.city?.toLowerCase().includes(cleanSearch);
    
    let matchingDishes: string[] = [];
    if (cleanSearch.length > 0 && menuSearchData) {
      matchingDishes = menuSearchData
        .filter(m => m.merchantId === (r.merchantId || r.id) && m.name.toLowerCase().includes(cleanSearch))
        .map(m => m.name);
    }

    const isMatch = cleanSearch === "" || matchesName || matchesCuisine || matchesCity || matchingDishes.length > 0;

    return isMatch ? { ...r, matchingDishes } : null;
  }).filter(Boolean) as (StorefrontDoc & { matchingDishes?: string[] })[];

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
