// ============================================================
// ANALYTICS REPOSITORY — Gangaram Analytics
// Module 13 — Repository pattern for reading rollup documents
// Abstracts Firestore queries behind clean domain methods
// ============================================================

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import type { MerchantDailyStats, PlatformMetrics } from "@/lib/firestoreSchema";

export interface MerchantAnalyticsResult {
  stats: MerchantDailyStats[];
  totalOrderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export interface PlatformAnalyticsResult {
  metrics: Array<PlatformMetrics & { date: string }>;
  totalOrders: number;
  totalGMV: number;
}

/**
 * Reads merchant daily stats for a given date range.
 */
export async function getMerchantDailyStats(
  merchantId: string,
  fromDate: string,
  toDate: string
): Promise<MerchantAnalyticsResult> {
  getAdminApp();
  const db = getFirestore();

  const snapshot = await db
    .collection("merchantDailyStats")
    .where("merchantId", "==", merchantId)
    .where("date", ">=", fromDate)
    .where("date", "<=", toDate)
    .orderBy("date", "asc")
    .get();

  const stats = snapshot.docs.map((doc) => {
    const data = doc.data() as MerchantDailyStats;
    return {
      ...data,
      avgOrderValue:
        data.orderCount > 0
          ? Math.round((data.grossRevenue / data.orderCount) * 100) / 100
          : 0,
    };
  }) as MerchantDailyStats[];

  const totalOrderCount = stats.reduce((sum, s) => sum + s.orderCount, 0);
  const totalRevenue = stats.reduce((sum, s) => sum + s.grossRevenue, 0);
  const avgOrderValue =
    totalOrderCount > 0 ? Math.round((totalRevenue / totalOrderCount) * 100) / 100 : 0;

  return { stats, totalOrderCount, totalRevenue, avgOrderValue };
}

/**
 * Reads platform metrics for a given date range.
 * Docs are keyed by date string (yyyy-mm-dd) as document ID.
 * Uses document ID range queries for efficiency.
 */
export async function getPlatformMetrics(
  fromDate: string,
  toDate: string
): Promise<PlatformAnalyticsResult> {
  getAdminApp();
  const db = getFirestore();

  // Platform metrics docs are keyed by date as document ID
  const snapshot = await db
    .collection("platformMetrics")
    .orderBy("__name__")
    .startAt(fromDate)
    .endAt(toDate + "\uf8ff")
    .get();

  const metrics = snapshot.docs.map((doc) => {
    const data = doc.data() as PlatformMetrics;
    return { ...data, date: doc.id };
  });

  const totalOrders = metrics.reduce((sum, m) => sum + (m.totalOrders || 0), 0);
  const totalGMV = metrics.reduce((sum, m) => sum + (m.totalGMV || 0), 0);

  return { metrics, totalOrders, totalGMV };
}

/**
 * Computes the aggregate savings from aggregator price comparisons.
 */
export function computeAggregatorSavings(
  items: Array<{ ourPrice: number; aggregatorPrice: number | null; qty: number }>
): number {
  return items.reduce((sum, item) => {
    if (item.aggregatorPrice && item.aggregatorPrice > item.ourPrice) {
      return sum + (item.aggregatorPrice - item.ourPrice) * item.qty;
    }
    return sum;
  }, 0);
}
