// ============================================================
// COUPON REPOSITORY — Gangaram Promotions
// Module 14 — Abstracts Firestore reads for coupons
// ============================================================

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface CouponDocument {
  merchantId: string | null;
  discountPercent: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  usesCount: number;
  expiresAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
  
  // Version 2 Smart Coupon Extensions
  scope?: string;
  targetProductIds?: string[];
  targetCategories?: string[];
  comboProductIds?: string[];
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
}

/**
 * Fetches a coupon by its code from /coupons/{couponCode}.
 * Returns null if the coupon doesn't exist.
 */
export async function getCoupon(couponCode: string): Promise<CouponDocument | null> {
  getAdminApp();
  const db = getFirestore();
  const snap = await db.collection("coupons").doc(couponCode).get();

  if (!snap.exists) return null;
  return snap.data() as CouponDocument;
}

/**
 * Gets the number of times a user has redeemed a specific coupon.
 */
export async function getUserRedemptionCount(
  userId: string,
  couponCode: string
): Promise<number> {
  getAdminApp();
  const db = getFirestore();
  const snap = await db
    .collection("couponRedemptions")
    .doc(`${userId}_${couponCode}`)
    .get();

  if (!snap.exists) return 0;
  return (snap.data()?.redeemedCount as number) || 0;
}

/**
 * Increments the usage counters for a coupon redemption.
 * Uses atomic increments for safety under concurrent requests.
 */
export async function recordCouponRedemption(
  userId: string,
  couponCode: string
): Promise<void> {
  getAdminApp();
  const db = getFirestore();

  const couponRef = db.collection("coupons").doc(couponCode);
  const redemptionRef = db.collection("couponRedemptions").doc(`${userId}_${couponCode}`);

  await db.runTransaction(async (transaction) => {
    transaction.set(couponRef, { usesCount: FieldValue.increment(1) }, { merge: true });
    transaction.set(redemptionRef, { redeemedCount: FieldValue.increment(1) }, { merge: true });
  });
}

/**
 * Creates or updates a coupon document.
 */
export async function upsertCoupon(
  couponCode: string,
  data: Partial<CouponDocument>
): Promise<void> {
  getAdminApp();
  const db = getFirestore();

  await db
    .collection("coupons")
    .doc(couponCode)
    .set(
      {
        ...data,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
}

/**
 * Deletes a coupon document.
 */
export async function deleteCoupon(couponCode: string): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  await db.collection("coupons").doc(couponCode).delete();
}
