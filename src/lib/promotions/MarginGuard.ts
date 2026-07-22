// ============================================================
// MARGIN GUARD — Gangaram Promotions
// Module 14 — PURE function: verifies hotel profit margins
// Rejects if projected hotelShare < minimumProfitFloor
// ============================================================

export interface MarginGuardInput {
  hotelShare: number;
  discountPercent: number;
  minimumProfitFloor: number;
}

export interface MarginGuardResult {
  allowed: boolean;
  projectedHotelShare: number;
  shortfall: number;
  reason?: string;
}

/**
 * Checks whether applying a discount would cause the hotel's share
 * to fall below the minimum profit floor.
 *
 * PURE function — no database reads, no side-effects.
 *
 * @param input - Financial details before discount
 * @returns MarginGuardResult with projected values
 */
export function checkMargin(input: MarginGuardInput): MarginGuardResult {
  const discountMultiplier = 1 - input.discountPercent / 100;
  const projectedHotelShare = Math.round(input.hotelShare * discountMultiplier * 100) / 100;
  const shortfall = Math.max(0, input.minimumProfitFloor - projectedHotelShare);
  const allowed = projectedHotelShare >= input.minimumProfitFloor;

  return {
    allowed,
    projectedHotelShare,
    shortfall,
    reason: allowed
      ? undefined
      : `Discount would reduce hotel share to ₹${projectedHotelShare}, below the minimum of ₹${input.minimumProfitFloor}`,
  };
}

/**
 * Calculates the maximum discount percent allowed without violating
 * the minimum profit floor.
 */
export function calculateMaxDiscount(
  hotelShare: number,
  minimumProfitFloor: number
): number {
  if (hotelShare <= 0 || minimumProfitFloor <= 0) return 0;
  if (hotelShare <= minimumProfitFloor) return 0;

  const maxDiscountDecimal = 1 - minimumProfitFloor / hotelShare;
  return Math.floor(maxDiscountDecimal * 100);
}
