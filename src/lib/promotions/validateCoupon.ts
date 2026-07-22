// ============================================================
// VALIDATE COUPON — Gangaram Promotions
// Module 14 — PURE function, no Firestore side-effects
// Unit-testable: all inputs passed explicitly
// ============================================================

export interface CouponValidationInput {
  isActive: boolean;
  discountPercent: number;
  expiresAt: { toMillis?: () => number; seconds?: number };
  maxUsesTotal: number;
  maxUsesPerUser: number;
  usesCount: number;
}

export interface CouponValidationResult {
  valid: boolean;
  discountPercent?: number;
  reason?: string;
}

/**
 * Validates a coupon document against usage constraints.
 * PURE function — no database reads, no side-effects.
 *
 * Checks:
 * - isActive must be true
 * - expiresAt must be in the future
 * - maxUsesTotal must not be reached
 * - maxUsesPerUser must not be reached
 *
 * @param coupon - The coupon document data
 * @param userRedemptionCount - Number of times the current user has redeemed this coupon
 * @param now - Current timestamp in milliseconds (injectable for testing)
 */
export function validateCoupon(
  coupon: CouponValidationInput,
  userRedemptionCount: number,
  now: number = Date.now()
): CouponValidationResult {
  if (!coupon.isActive) {
    return { valid: false, reason: "Coupon is no longer active" };
  }

  // Check expiry
  const expiresMs =
    (coupon.expiresAt as { toMillis?: () => number }).toMillis?.() ??
    ((coupon.expiresAt as { seconds?: number }).seconds ?? 0) * 1000;

  if (expiresMs && expiresMs < now) {
    return { valid: false, reason: "Coupon has expired" };
  }

  // Check total usage cap
  if (coupon.usesCount >= coupon.maxUsesTotal) {
    return { valid: false, reason: "Coupon has reached its maximum total uses" };
  }

  // Check per-user usage cap
  if (userRedemptionCount >= coupon.maxUsesPerUser) {
    return { valid: false, reason: "You have already used this coupon the maximum number of times" };
  }

  return { valid: true, discountPercent: coupon.discountPercent };
}
