"use client";

import { useEffect, useState, useMemo } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/contexts";
import { Navbar } from "@/lib/components/layout/Navbar";
import { Footer } from "@/lib/components/layout/Footer";
import { BottomNav } from "@/lib/components/layout/BottomNav";
import { FloatingCartButton } from "@/lib/components/cart/FloatingCartButton";
import { MenuItemCard } from "@/lib/components/menu/MenuItemCard";
import { CategoryTabs } from "@/lib/components/menu/CategoryTabs";
import { PriceComparison } from "@/lib/components/menu/PriceComparison";
import { ReviewsSection } from "@/lib/components/review/ReviewsSection";
import { MenuItemSkeleton } from "@/lib/components/common/Skeleton";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

// Version 2 Components
import { HeroBanner } from "@/lib/components/storefront/HeroBanner";
import { CouponSlot } from "@/lib/components/storefront/CouponSlot";
import { FeaturedSection } from "@/lib/components/storefront/FeaturedSection";
import { RestaurantSearch } from "@/lib/components/storefront/RestaurantSearch";

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
  layoutConfig?: {
    showHeroBanner?: boolean;
    showSearch?: boolean;
    showCouponSlot?: boolean;
    showFeaturedSection?: boolean;
    showCategories?: boolean;
    showMenu?: boolean;
    showReviews?: boolean;
  };
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
  
  // Navigation & Search State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
        <main id="main-content" className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2 heading-tight">Restaurant not found</h2>
            <Link href="/" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              Go home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Derived state for Search & Categories
  const categories = useMemo(() => [...new Set(menuItems.map((item) => item.category))], [menuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    // Apply search filter (Case-insensitive check on name or category)
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.category.toLowerCase().includes(lowerQuery)
      );
    } 
    // Only apply category filter if search is empty
    else if (selectedCategory) {
      items = items.filter((item) => item.category === selectedCategory);
    }
    
    return items;
  }, [menuItems, searchQuery, selectedCategory]);

  // Compute aggregator metrics from available menu items
  const totalAggregatorPrice = menuItems.reduce((sum, item) => sum + (item.aggregatorPrice || item.ourPrice), 0);
  const totalOurPrice = menuItems.reduce((sum, item) => sum + item.ourPrice, 0);
  const avgSavingsPercent = totalAggregatorPrice > 0 ? Math.round(((totalAggregatorPrice - totalOurPrice) / totalAggregatorPrice) * 100) : 0;

  // Resolve layout configuration defaults
  const layoutConfig = {
    showHeroBanner: storefront?.layoutConfig?.showHeroBanner ?? true,
    showSearch: storefront?.layoutConfig?.showSearch ?? true,
    showCouponSlot: storefront?.layoutConfig?.showCouponSlot ?? true,
    showFeaturedSection: storefront?.layoutConfig?.showFeaturedSection ?? true,
    showCategories: storefront?.layoutConfig?.showCategories ?? true,
    showMenu: storefront?.layoutConfig?.showMenu ?? true,
    showReviews: storefront?.layoutConfig?.showReviews ?? true,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-24 md:pb-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm mb-4 hover:opacity-80 active:scale-[0.98]"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {storefront && (
          <div className="space-y-6">
            
            {/* 1. Hero Banner Slot */}
            {layoutConfig.showHeroBanner && (
              <HeroBanner
                name={storefront.name}
                cuisine={storefront.cuisine}
                isOnline={storefront.isOnline}
                openingHours={storefront.openingHours}
                priceForTwo={storefront.priceForTwo}
                averageRating={storefront.averageRating}
                reviewCount={storefront.reviewCount}
                city={storefront.city}
                brandColor={storefront.brandColor}
                promoBanner={storefront.promoBanner}
              />
            )}

            {/* Savings Banner */}
            {layoutConfig.showMenu && avgSavingsPercent > 0 && (
              <PriceComparison ourPrice={totalOurPrice} aggregatorPrice={totalAggregatorPrice} />
            )}

            {/* 2. Search Bar Slot */}
            {layoutConfig.showSearch && (
              <RestaurantSearch onSearch={setSearchQuery} />
            )}

            {/* 3. Coupon Slot (Placeholder) */}
            {layoutConfig.showCouponSlot && (
              <CouponSlot merchantId={storefront.merchantId} />
            )}

            {/* 4. Featured Section Slot (Placeholder) */}
            {layoutConfig.showFeaturedSection && (
              <FeaturedSection merchantId={storefront.merchantId} />
            )}

            {/* 5. Category Navigation Slot */}
            {layoutConfig.showCategories && categories.length > 0 && !searchQuery.trim() && (
              <div className="sticky top-[64px] z-20 py-2" style={{ background: 'var(--bg)' }}>
                <CategoryTabs
                  categories={categories}
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
              </div>
            )}

            {/* 6. Menu Items Slot */}
            {layoutConfig.showMenu && (
              <div className="space-y-4 pt-2">
                {menuLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <MenuItemSkeleton key={i} />)
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="font-medium">No items found</p>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")} 
                        className="text-sm mt-2 font-medium hover:underline" 
                        style={{ color: "var(--primary)" }}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  filteredItems.map((item) => (
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
                  ))
                )}
              </div>
            )}

            {/* 7. Reviews Section Slot */}
            {layoutConfig.showReviews && (
              <div className="pt-8">
                <ReviewsSection merchantId={storefront.merchantId} averageRating={storefront.averageRating} reviewCount={storefront.reviewCount} />
              </div>
            )}

          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
      <FloatingCartButton />
    </div>
  );
}
