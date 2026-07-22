"use client";

import { useEffect, useState } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth, useCart } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { FloatingCartButton } from "@/lib/components/cart/FloatingCartButton";
import { MenuItemCard } from "@/lib/components/menu/MenuItemCard";
import { CategoryTabs } from "@/lib/components/menu/CategoryTabs";
import { PriceComparison } from "@/lib/components/menu/PriceComparison";
import { MenuItemSkeleton } from "@/lib/components/common/Skeleton";
import { Store, Clock, IndianRupee, MapPin, ChevronLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

interface StorefrontData {
  id?: string;
  merchantId: string;
  name: string;
  slug: string;
  city: string;
  isOnline?: boolean;
  brandColor: string | null;
  cuisine: string | null;
  openingHours: string | null;
  priceForTwo: number | null;
  promoBanner: string | null;
  onboardingStatus: string;
}

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  ourPrice: number;
  baseCost: number;
  hotelProfit: number;
  isAvailable: boolean;
  aggregatorPrice: number | null;
  category: string;
  imageUrl: string;
  veg: boolean;
  sortOrder: number;
}

interface RestaurantPageClientProps {
  initialStorefront: StorefrontData | null;
  initialError: string | null;
}

export default function RestaurantPageClient({
  initialStorefront,
  initialError,
}: RestaurantPageClientProps) {
  const { slug } = { slug: initialStorefront?.slug || "" };
  const { user } = useAuth();
  const [storefront, setStorefront] = useState<StorefrontData | null>(initialStorefront);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [loading, setLoading] = useState(!initialStorefront);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    if (!initialStorefront?.merchantId) return;

    const db = getFirebaseFirestore();
    const menuRef = collection(db, `merchants/${initialStorefront.merchantId}/menus`);
    const menuQuery = query(menuRef, where("isAvailable", "==", true));

    const unsubMenu = onSnapshot(
      menuQuery,
      (menuSnap) => {
        const items = menuSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MenuItemData[];
        setMenuItems(items.sort((a, b) => a.sortOrder - b.sortOrder));
      },
      () => {
        // Menu load failure is non-critical
      }
    );

    return () => unsubMenu();
  }, [initialStorefront?.merchantId]);

  const categories = [...new Set(menuItems.map((i) => i.category))];
  const filteredItems = selectedCategory
    ? menuItems.filter((i) => i.category === selectedCategory)
    : menuItems;

  const minAggregatorPrice = menuItems.reduce((min, item) => {
    if (item.aggregatorPrice && item.aggregatorPrice < min) return item.aggregatorPrice;
    return min;
  }, Infinity);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full pb-24">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <MenuItemSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !storefront) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">{error || "Not found"}</h2>
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--primary)" }}>
              <ChevronLeft className="w-4 h-4" /> Back to restaurants
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Restaurant Hero */}
      <div className="relative h-48 md:h-64 flex items-center justify-center overflow-hidden" style={{ background: storefront.brandColor || "var(--primary-light)" }}>
        {storefront.promoBanner ? (
          <img src={storefront.promoBanner} alt={storefront.name} className="w-full h-full object-cover" />
        ) : (
          <Store className="w-24 h-24 opacity-20 text-white" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link href="/" className="absolute top-4 left-4 p-2 rounded-xl bg-black/30 text-white hover:bg-black/50 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </div>

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full pb-24">
        {/* Restaurant Info */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{storefront.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            {storefront.cuisine && <span>{storefront.cuisine}</span>}
            {storefront.priceForTwo && (
              <span className="flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5" /> {storefront.priceForTwo} for two
              </span>
            )}
            {storefront.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {storefront.city}
              </span>
            )}
          </div>

          {/* Price Comparison Summary */}
          {minAggregatorPrice < Infinity && (
            <div className="mt-3">
              <PriceComparison ourPrice={menuItems[0]?.ourPrice || 0} aggregatorPrice={minAggregatorPrice} />
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-4">Menu</h2>
          {categories.length > 0 && (
            <CategoryTabs categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
          )}
        </div>

        {!user && (
          <div className="p-4 rounded-xl mb-6 text-sm flex items-center gap-2" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <Link href="/login" className="font-semibold hover:underline">Login</Link> to add items to cart
          </div>
        )}

        <div className="space-y-3">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              itemId={item.id}
              name={item.name}
              description={item.description}
              ourPrice={item.ourPrice}
              aggregatorPrice={item.aggregatorPrice}
              category={item.category}
              imageUrl={item.imageUrl}
              veg={item.veg}
              merchantId={storefront.merchantId}
              merchantName={storefront.name}
              baseCost={item.baseCost}
              hotelProfit={item.hotelProfit}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="font-medium">No items in this category</p>
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
      <FloatingCartButton />
    </div>
  );
}
