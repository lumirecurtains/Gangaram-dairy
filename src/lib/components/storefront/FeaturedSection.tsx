"use client";

import { useState, useEffect } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { MenuItemCard } from "@/lib/components/menu/MenuItemCard";
import { Sparkles, TrendingUp, Flame, ChefHat, Star } from "lucide-react";

interface FeaturedSectionProps {
  merchantId: string;
  merchantName: string;
  menuItems: any[]; // The full loaded menu catalogue
}

interface FeaturedSectionData {
  id: string;
  name: string;
  sectionType: string;
  itemIds: string[];
  priority: number;
}

export function FeaturedSection({ merchantId, merchantName, menuItems }: FeaturedSectionProps) {
  const [sections, setSections] = useState<FeaturedSectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSections() {
      if (!merchantId) return;
      try {
        const db = getFirebaseFirestore();
        const q = query(
          collection(db, `merchants/${merchantId}/featuredSections`),
          where("isActive", "==", true),
          orderBy("priority", "desc")
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedSectionData));
        setSections(fetched);
      } catch (err) {
        console.error("Failed to load featured sections", err);
      } finally {
        setLoading(false);
      }
    }
    loadSections();
  }, [merchantId]);

  if (loading || sections.length === 0 || menuItems.length === 0) return null;

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "best_seller": return <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
      case "trending": return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case "todays_special": return <Flame className="w-5 h-5 text-orange-500" />;
      case "chefs_recommendation": return <ChefHat className="w-5 h-5 text-purple-500" />;
      default: return <Sparkles className="w-5 h-5 text-green-500" />;
    }
  };

  return (
    <div className="space-y-8 pb-4">
      {sections.map(section => {
        // Resolve references against the loaded menu array
        // Filters out any products that were deleted from the menu or marked unavailable
        const populatedItems = section.itemIds
          .map(id => menuItems.find(m => m.id === id))
          .filter(item => item && item.isAvailable);

        if (populatedItems.length === 0) return null;

        return (
          <div key={section.id} className="pt-2">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              {getSectionIcon(section.sectionType)}
              {section.name}
            </h2>
            
            {/* Horizontal scroll snapping grid for featured items */}
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-none snap-x snap-mandatory">
              {populatedItems.map(item => (
                <div key={item.id} className="min-w-[280px] md:min-w-[320px] snap-center flex-shrink-0">
                  <MenuItemCard
                    itemId={item.id}
                    name={item.name}
                    description={item.description}
                    ourPrice={item.ourPrice}
                    aggregatorPrice={item.aggregatorPrice}
                    category={item.category}
                    imageUrl={item.imageUrl}
                    veg={item.veg}
                    merchantId={merchantId}
                    merchantName={merchantName}
                    baseCost={item.baseCost}
                    hotelProfit={item.hotelProfit}
                    isAvailable={item.isAvailable}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
