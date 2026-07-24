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
import { ReviewsSection } from "@/lib/components/review/ReviewsSection";
import { MenuItemSkeleton } from "@/lib/components/common/Skeleton";
import { Store, Clock, IndianRupee, MapPin, ChevronLeft, AlertCircle, Star } from "lucide-react";
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
  averageRating?: number;
  reviewCount?: number;
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
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Real-time storefront listener
  useEffect(() => {
    if (!slug) return;
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, "storefronts"),
      where("slug", "==", slug),
      where("onboardingStatus", "==", "LIVE")
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setStorefront({ id: snap.docs[0].id, ...snap.docs[0].data() } as StorefrontData);
      }
    });
    return unsub;
  }, [slug]);

  // Real-time menu listener
  useEffect(() => {
    if (!storefront?.merchantId) return;
    const db = getFirebaseFirestore();
    const menuRef = collection(db, `merchants/${storefront.merchantId}/menus`);
    const unsub = onSnapshot(menuRef, (snap) => {
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MenuItemData));
      setMenuItems(items.sort((a, b) => a.sortOrder - b.sortOrder));
      setMenuLoading(false);
    });
    return unsub;
  }, [storefront?.merchantId]);

  // Handle initial error
  if (initialError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2">Restaurant not found</h2>
            <Link href="/" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              Go home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const categories = [...new Set(menuItems.map((item) => item.category))];
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : menuItems;

  // Compute aggregator metrics from available menu items
  const totalAggregatorPrice = menuItems.reduce(
    (sum, item) => sum + (item.aggregatorPrice || item.ourPrice),
    0
  );
  const totalOurPrice = menuItems.reduce((sum, item) => sum + item.ourPrice, 0);
  const avgSavingsPercent =
    totalAggregatorPrice > 0
      ? Math.round(((totalAggregatorPrice - totalOurPrice) / totalAggregatorPrice) * 100)
      : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-24 md:pb-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>

        {/* Restaurant Hero */}
        {storefront && (
          <>
            <div
              className="rounded-2xl p-6 mb-6 relative overflow-hidden"
              style={{ background: storefront.brandColor || "var(--primary-light)" }}
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                    {storefront.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                    {storefront.cuisine && <span>{storefront.cuisine}</span>}
                    {storefront.isOnline !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        storefront.isOnline ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"
                      }`}>
                        {storefront.isOnline ? "Open" : "Closed"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/70">
                    {storefront.openingHours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {storefront.openingHours}
                      </span>
                    )}
                    {storefront.priceForTwo && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4" /> {storefront.priceForTwo} for two
                      </span>
                    )}
                    {storefront.averageRating && storefront.averageRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {storefront.averageRating.toFixed(1)} ({storefront.reviewCount || 0})
                      </span>
                    )}
                  </div>
                </div>
                {storefront.city && (
                  <span className="flex items-center gap-1 text-white/60 text-xs">
                    <MapPin className="w-3 h-3" /> {storefront.city}
                  </span>
                )}
              </div>
            </div>

            {/* Savings Banner */}
            {avgSavingsPercent > 0 && (
              <div className="mb-6">
                <PriceComparison ourPrice={totalOurPrice} aggregatorPrice={totalAggregatorPrice} />
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div className="mb-4">
                <CategoryTabs
                  categories={categories}
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
              </div>
            )}

            {/* Menu Items */}
            <div className="space-y-4 mb-8">
              {menuLoading
                ? Array.from({ length: 4 }).map((_, i) => <MenuItemSkeleton key={i} />)
                : filteredItems.map((item) => (
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

            {filteredItems.length === 0 && !menuLoading && (
              <div className="text-center py-12">
                <p className="font-medium">No items in this category</p>
              </div>
            )}

            {/* Reviews Section */}
            <div className="mt-10 mb-8">
              <ReviewsSection merchantId={storefront.merchantId} />
            </div>
          </>
        )}
      </main>

      <Footer />
      <BottomNav />
      <FloatingCartButton />
    </div>
  );
}
