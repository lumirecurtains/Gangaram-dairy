// ============================================================
// LOYALTY ACCRUAL — Gangaram Promotions
// Module 14 — Handles loyalty point additions at order completion
// ============================================================

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface LoyaltyAccrualInput {
  userId: string;
  orderGrandTotal: number;
}

const LOYALTY_POINTS_PER_RUPEE = 1; // 1 point per rupee spent
const LOYALTY_BONUS_THRESHOLD = 500; // Bonus points threshold
const LOYALTY_BONUS_AMOUNT = 50; // Bonus points awarded

/**
 * Accrues loyalty points for a user after a completed order.
 * Points are calculated as 1 point per rupee of grandTotal.
 *
 * Uses atomic FieldValue.increment() for safe concurrent updates.
 * Called from the order-completion transaction flow.
 *
 * @param input - User ID and order total
 */
export async function accrueLoyaltyPoints(input: LoyaltyAccrualInput): Promise<void> {
  getAdminApp();
  const db = getFirestore();

  const pointsEarned = Math.floor(input.orderGrandTotal * LOYALTY_POINTS_PER_RUPEE);
  const bonusPoints =
    input.orderGrandTotal >= LOYALTY_BONUS_THRESHOLD ? LOYALTY_BONUS_AMOUNT : 0;
  const totalPoints = pointsEarned + bonusPoints;

  const loyaltyRef = db.collection("loyaltyAccounts").doc(input.userId);

  await loyaltyRef.set(
    {
      pointsBalance: FieldValue.increment(totalPoints),
      lifetimePoints: FieldValue.increment(totalPoints),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

/**
 * Gets the current loyalty account for a user.
 * Returns default values if no account exists.
 */
export async function getLoyaltyAccount(userId: string): Promise<{
  pointsBalance: number;
  lifetimePoints: number;
}> {
  getAdminApp();
  const db = getFirestore();
  const snap = await db.collection("loyaltyAccounts").doc(userId).get();

  if (!snap.exists) {
    return { pointsBalance: 0, lifetimePoints: 0 };
  }

  const data = snap.data()!;
  return {
    pointsBalance: (data.pointsBalance as number) || 0,
    lifetimePoints: (data.lifetimePoints as number) || 0,
  };
}
