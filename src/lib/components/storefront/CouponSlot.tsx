"use client";

import { useState, useEffect, useMemo } from "react";
import { Tag, ChevronRight } from "lucide-react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth, useCart } from "@/lib/contexts";
import { resolveCouponEligibility } from "@/lib/promotions/resolvers/couponResolver";

interface CouponSlotProps {
  merchantId: string;
  menuItems: any[];
}

export function CouponSlot({ merchantId, menuItems }: CouponSlotProps) {
  const { user } = useAuth();
  const { items: cartItems } = useCart();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoupons() {
      if (!merchantId) return;
      try {
        const db = getFirebaseFirestore();
        
        const qMerchant = query(
          collection(db, "coupons"),
          where("merchantId", "==", merchantId),
          where("isActive", "==", true)
        );
        
        const qGlobal = query(
          collection(db, "coupons"),
          where("merchantId", "==", null),
          where("isActive", "==", true)
        );
        
        const [snapMerchant, snapGlobal] = await Promise.all([
          getDocs(qMerchant),
          getDocs(qGlobal)
        ]);
        
        const fetched = [...snapMerchant.docs, ...snapGlobal.docs].map((doc) => ({ id: doc.id, ...doc.data() }));
        setCoupons(fetched);
      } catch (err) {
        console.error("Failed to load storefront coupons", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCoupons();
  }, [merchantId]);

  // Dynamically resolve eligibility for all active coupons against the current cart context
  const eligibleCoupons = useMemo(() => {
    if (coupons.length === 0) return [];
    const context = {
      userId: user?.uid || "guest",
      isFirstOrder: false, // Assume false for UI display threshold until checked at checkout API
      cartItems: cartItems as any,
      cartCategories: [...new Set(cartItems.map((i: any) => menuItems.find(m => m.id === i.itemId)?.category).filter((cat): cat is string => Boolean(cat)))],
      currentTimeMs: Date.now()
    };

    return coupons.filter(c => {
      // Don't show expired coupons
      const isExpired = c.expiresAt?._seconds ? (c.expiresAt._seconds * 1000) < Date.now() : false;
      if (isExpired) return false;

      // Use the pure resolver
      const result = resolveCouponEligibility(c, context);
      return result.eligible;
    }).sort((a, b) => b.discountPercent - a.discountPercent); // Show highest discount first
  }, [coupons, cartItems, menuItems, user]);

  if (loading || eligibleCoupons.length === 0) return null;

  return (
    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none snap-x snap-mandatory">
      {eligibleCoupons.map((coupon) => (
        <div 
          key={coupon.id} 
          className="flex-shrink-0 w-[280px] snap-center p-4 rounded-xl border flex items-center justify-between"
          style={{ background: "rgba(0,200,83,0.05)", borderColor: "rgba(0,200,83,0.2)" }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-lg bg-green-100 text-green-600">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-green-700 leading-tight">
                {coupon.discountPercent}% OFF
              </p>
              <p className="text-xs text-green-600/80 font-semibold uppercase tracking-wider mt-0.5">
                Code: {coupon.id}
              </p>
              {coupon.scope === "first_order" && <p className="text-[10px] text-green-600/60 mt-0.5">First order only</p>}
            </div>
          </div>
          <div className="h-full flex items-center border-l border-green-200/50 pl-3">
            <span className="text-[10px] font-bold text-green-600 uppercase">Apply at<br/>Checkout</span>
          </div>
        </div>
      ))}
    </div>
  );
}
