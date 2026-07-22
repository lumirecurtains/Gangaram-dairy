// ============================================================
// ROLLUP WRITER — Gangaram Analytics
// Module 13 — Atomic write-time aggregation using Firestore
// increments. Call from order-completion flow.
// ============================================================

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface OrderDataForRollup {
  merchantId: string;
  grandTotal: number;
  hotelShare: number;
  riderShare: number;
  subTotal: number;
  aggregatorPriceTotal?: number | null;
  ourPriceTotal?: number | null;
}

/**
 * Increments daily merchant stats and platform metrics atomically.
 * Uses a single batch write for consistency across both docs.
 *
 * @param orderData - The completed order's financial data
 */
export async function incrementDailyStats(orderData: OrderDataForRollup): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
  const statId = `${orderData.merchantId}_${today}`;

  const merchantStatRef = db.collection("merchantDailyStats").doc(statId);
  const platformMetricRef = db.collection("platformMetrics").doc(today);

  let aggregatorSavings = 0;
  if (orderData.aggregatorPriceTotal != null && orderData.ourPriceTotal != null) {
    aggregatorSavings = Math.max(0, orderData.aggregatorPriceTotal - orderData.ourPriceTotal);
  }

  const batch = db.batch();

  // Merchant daily stats
  batch.set(
    merchantStatRef,
    {
      merchantId: orderData.merchantId,
      date: today,
      orderCount: FieldValue.increment(1),
      grossRevenue: FieldValue.increment(orderData.grandTotal),
      hotelShareTotal: FieldValue.increment(orderData.hotelShare),
      riderShareTotal: FieldValue.increment(orderData.riderShare),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  // Platform metrics
  batch.set(
    platformMetricRef,
    {
      totalOrders: FieldValue.increment(1),
      totalGMV: FieldValue.increment(orderData.grandTotal),
      aggregatorSavingsTotal: FieldValue.increment(aggregatorSavings),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * Increments the cancelled count for a merchant on a given date.
 */
export async function incrementCancelledCount(
  merchantId: string,
  dateStr?: string
): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  const today = dateStr || new Date().toISOString().split("T")[0];
  const statId = `${merchantId}_${today}`;

  await db
    .collection("merchantDailyStats")
    .doc(statId)
    .set(
      {
        cancelledCount: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
}
