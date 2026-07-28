import { Coupon } from "@/lib/firestoreSchema";
import { OrderItem } from "@/lib/firestoreSchema";

export interface CouponContext {
  userId: string;
  isFirstOrder: boolean;
  cartItems: OrderItem[];
  cartCategories: string[]; // Dynamically resolved from menu definitions before evaluation
  currentTimeMs: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Foundation Resolver: Checks strictly if a given coupon's scope requirements
 * match the current user/cart context.
 * 
 * NOTE: This does NOT apply the coupon mathematically (which happens via MarginGuard), 
 * nor does it check global maxUses (which happens via CouponRepository transaction).
 * It ONLY determines if the context satisfies the Smart Coupon scope.
 */
export function resolveCouponEligibility(
  coupon: Partial<Coupon>,
  context: CouponContext
): EligibilityResult {
  
  if (coupon.scope === "first_order" && !context.isFirstOrder) {
    return { eligible: false, reason: "Coupon is valid for first-time orders only." };
  }

  if (coupon.scope === "returning_customer" && context.isFirstOrder) {
    return { eligible: false, reason: "Coupon is valid for returning customers only." };
  }

  if (coupon.scope === "time_window") {
    if (!coupon.timeWindowStart || !coupon.timeWindowEnd) {
      // Malformed coupon setup, safely bypass scope lock
      return { eligible: true };
    }
    
    const now = new Date(context.currentTimeMs);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = coupon.timeWindowStart.split(":").map(Number);
    const [endH, endM] = coupon.timeWindowEnd.split(":").map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return { eligible: false, reason: `Coupon is only valid between ${coupon.timeWindowStart} and ${coupon.timeWindowEnd}.` };
    }
  }

  if (coupon.scope === "product") {
    if (!coupon.targetProductIds || coupon.targetProductIds.length === 0) {
      return { eligible: true }; // Malformed
    }
    const hasTargetProduct = context.cartItems.some(item => 
      coupon.targetProductIds!.includes(item.itemId)
    );
    if (!hasTargetProduct) {
      return { eligible: false, reason: "Cart must contain specific promotional items to use this coupon." };
    }
  }

  if (coupon.scope === "combo") {
    if (!coupon.targetProductIds || coupon.targetProductIds.length === 0) {
      return { eligible: true }; 
    }
    // Combo requires ALL target products to be present in the cart simultaneously
    const cartIds = context.cartItems.map(i => i.itemId);
    const hasAllTargets = coupon.targetProductIds.every(id => cartIds.includes(id));
    if (!hasAllTargets) {
      return { eligible: false, reason: "Cart does not meet the combo requirements for this coupon." };
    }
  }

  if (coupon.scope === "category") {
    if (!coupon.targetCategories || coupon.targetCategories.length === 0) {
      return { eligible: true }; 
    }
    const hasTargetCategory = context.cartCategories.some(cat => 
      coupon.targetCategories!.includes(cat)
    );
    if (!hasTargetCategory) {
      return { eligible: false, reason: "Cart must contain items from specific categories to use this coupon." };
    }
  }

  // "global" scope or all validations passed
  return { eligible: true };
}
