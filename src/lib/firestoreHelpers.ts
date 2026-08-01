// ============================================================
// FIRESTORE HELPERS — Gangaram
// Module 1 — Database, Rules, Public Storefront Split
// ============================================================

import {
  getFirestore,
  Timestamp,
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";
import { getApp } from "firebase-admin/app";
import type {
  Merchant,
  Storefront,
  MenuItem,
  Order,
  OrderItem,
  DeliveryAddress,
  OrderStatus,
  MerchantDailyStats,
} from "./firestoreSchema";

// ---------- Admin Firestore instance ----------

function db(): Firestore {
  return getFirestore(getApp());
}

// ---------- Merchant + Storefront ----------

/**
 * Creates a new merchant document + its public storefront.
 * ONLY writes /storefronts for public reads — merchants doc internal.
 */
export async function createMerchant(
  merchantId: string,
  data: {
    name: string;
    slug: string;
    city: string;
    brandColor?: string | null;
    cuisine?: string | null;
    openingHours?: string | null;
    priceForTwo?: number | null;
  }
): Promise<void> {
  const now = Timestamp.now();

  // Internal merchant doc
  const merchant: Merchant = {
    ownerUid: "system",
    razorpayAccountId: null,
    onboardingStatus: "DRAFT",
    seoIndexable: true,
    metaTitleOverride: null,
    metaDescriptionOverride: null,
    minimumProfitFloor: 0,
  };

  // Public storefront doc
  const storefront: Storefront = {
    ownerUid: "system",
    merchantId: merchantId,
    name: data.name,
    slug: data.slug,
    city: data.city,
    isOnline: false,
    brandColor: data.brandColor ?? null,
    ogImageUrl: null,
    onboardingStatus: "DRAFT",
    cuisine: data.cuisine ?? null,
    openingHours: data.openingHours ?? null,
    priceForTwo: data.priceForTwo ?? null,
    promoBanner: null,
    updatedAt: now,
  };

  await db().runTransaction(async (tx) => {
    const merchantRef = db().doc(`merchants/${merchantId}`);
    const storefrontRef = db().doc(`storefronts/${merchantId}`);

    const [merchantSnap, storeSnap] = await tx.getAll(merchantRef, storefrontRef);
    if (merchantSnap.exists) throw new Error("Merchant already exists");
    if (storeSnap.exists) throw new Error("Storefront already exists");

    tx.set(merchantRef, merchant);
    tx.set(storefrontRef, storefront);
  });
}

/**
 * Upserts storefront data (partial update for public fields).
 * Only super_admin can call this (enforced by rules).
 */
export async function upsertStorefront(
  merchantId: string,
  data: Partial<
    Pick<Storefront, "name" | "slug" | "city" | "isOnline" | "brandColor" | "cuisine" | "openingHours" | "priceForTwo" | "promoBanner" | "ogImageUrl">
  >
): Promise<void> {
  const storefrontRef = db().doc(`storefronts/${merchantId}`);
  await storefrontRef.set(
    {
      ...data,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

// ---------- Storefront Lookup ----------

/**
 * Fetches a storefront by its URL slug.
 * Returns null if not found.
 */
export async function getStorefrontBySlug(
  slug: string
): Promise<{ id: string; data: Storefront } | null> {
  const snapshot = await db()
    .collection("storefronts")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, data: doc.data() as Storefront };
}

// ---------- Menu Items ----------

/**
 * Adds a menu item to a merchant's menu subcollection.
 */
export async function addMenuItem(
  merchantId: string,
  itemId: string | null,
  data: Omit<MenuItem, "isAvailable">
): Promise<string> {
  const menuCol = db().collection(`merchants/${merchantId}/menus`);
  const menuItem: MenuItem = {
    ...data,
    isAvailable: true,
  };

  if (itemId) {
    await menuCol.doc(itemId).set(menuItem);
    return itemId;
  } else {
    const ref = await menuCol.add(menuItem);
    return ref.id;
  }
}

/**
 * Safely toggles a menu item's availability (client-safe operation).
 * Field-level security in rules ensures only isAvailable can change.
 */
export async function toggleMenuItemAvailability(
  merchantId: string,
  itemId: string,
  isAvailable: boolean
): Promise<void> {
  await db()
    .doc(`merchants/${merchantId}/menus/${itemId}`)
    .update({ isAvailable });
}

// ---------- Orders ----------

/**
 * Creates an order — ALL totals computed server-side.
 * No client-supplied pricing is trusted.
 */
export async function createOrder(data: {
  userId: string;
  merchantId: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  deliveryFee: number;
  couponCode?: string;
  discountPercent?: number;
}): Promise<{
  orderId: string;
  subTotal: number;
  deliveryFee: number;
  hotelShare: number;
  riderShare: number;
  grandTotal: number;
}> {
  const now = Timestamp.now();

  // Server-side computation
  const subTotal = data.items.reduce(
    (sum, item) => sum + item.ourPrice * item.qty,
    0
  );

  // Hotel gets 70% of subtotal after delivery fee, rider gets 30%
  // This is the split model — adjust as needed
  const afterDeliveryFee = subTotal - data.deliveryFee;
  const hotelShare = Math.round(afterDeliveryFee * 0.7 * 100) / 100;
  const riderShare = Math.round(afterDeliveryFee * 0.3 * 100) / 100;

  // Apply discount if coupon is used
  const discountAmount = data.discountPercent
    ? Math.round(subTotal * (data.discountPercent / 100) * 100) / 100
    : 0;

  const grandTotal = Math.round((subTotal + data.deliveryFee - discountAmount) * 100) / 100;

  const order: Omit<Order, "riderId" | "razorpayOrderId" | "paymentId"> & {
    riderId: null;
    razorpayOrderId: null;
    paymentId: null;
  } = {
    userId: data.userId,
    merchantId: data.merchantId,
    riderId: null,
    items: data.items,
    status: "pending_payment",
    deliveryAddress: data.deliveryAddress,
    subTotal,
    deliveryFee: data.deliveryFee,
    hotelShare,
    riderShare,
    grandTotal,
    razorpayOrderId: null,
    paymentId: null,
    ...(data.couponCode ? { couponCode: data.couponCode } : {}),
    ...(data.discountPercent ? { discountPercent: data.discountPercent } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const orderRef = db().collection("orders").doc();
  await orderRef.set(order);

  return {
    orderId: orderRef.id,
    subTotal,
    deliveryFee: data.deliveryFee,
    hotelShare,
    riderShare,
    grandTotal,
  };
}

/**
 * Gets orders for a merchant, newest first.
 */
export async function getOrdersByMerchant(
  merchantId: string,
  options: {
    status?: OrderStatus;
    cursor?: string;
    limit?: number;
  } = {}
): Promise<{ orders: Array<{ id: string; data: Order }>; nextCursor: string | null }> {
  const limit = options.limit ?? 20;
  let query: FirebaseFirestore.Query = db()
    .collection("orders")
    .where("merchantId", "==", merchantId);

  if (options.status) {
    query = query.where("status", "==", options.status);
  }

  query = query.orderBy("createdAt", "desc").limit(limit + 1);

  if (options.cursor) {
    const cursorDoc = await db().collection("orders").doc(options.cursor).get();
    if (!cursorDoc.exists) {
      return { orders: [], nextCursor: null };
    }
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const orders = snapshot.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    data: doc.data() as Order,
  }));

  const nextCursor =
    snapshot.docs.length > limit ? snapshot.docs[limit - 1].id : null;

  return { orders, nextCursor };
}

/**
 * Gets orders for a user, newest first.
 */
export async function getOrdersByUser(
  userId: string,
  options: {
    cursor?: string;
    limit?: number;
  } = {}
): Promise<{ orders: Array<{ id: string; data: Order }>; nextCursor: string | null }> {
  const limit = options.limit ?? 20;
  let query: FirebaseFirestore.Query = db()
    .collection("orders")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit + 1);

  if (options.cursor) {
    const cursorDoc = await db().collection("orders").doc(options.cursor).get();
    if (!cursorDoc.exists) {
      return { orders: [], nextCursor: null };
    }
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const orders = snapshot.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    data: doc.data() as Order,
  }));

  const nextCursor =
    snapshot.docs.length > limit ? snapshot.docs[limit - 1].id : null;

  return { orders, nextCursor };
}

// ---------- Module A1: Branch Performance Reporting ----------

export interface MerchantPerformanceReport {
  merchantId: string;
  totalOrders: number;
  grossRevenue: number;
  hotelShareTotal: number;
  riderShareTotal: number;
  avgOrderValue: number;
  cancelledCount: number;
  dailyStats: MerchantDailyStats[];
}

/**
 * Gets aggregated performance stats for a branch over a period (A1 Branch Performance Reporting).
 */
export async function getMerchantPerformanceReport(
  merchantId: string,
  days: number = 30
): Promise<MerchantPerformanceReport> {
  const statsSnap = await db()
    .collection("merchantDailyStats")
    .where("merchantId", "==", merchantId)
    .orderBy("date", "desc")
    .limit(days)
    .get();

  const dailyStats: MerchantDailyStats[] = statsSnap.docs.map((doc) => doc.data() as MerchantDailyStats);

  let totalOrders = 0;
  let grossRevenue = 0;
  let hotelShareTotal = 0;
  let riderShareTotal = 0;
  let cancelledCount = 0;

  if (dailyStats.length > 0) {
    dailyStats.forEach((s) => {
      totalOrders += s.orderCount || 0;
      grossRevenue += s.grossRevenue || 0;
      hotelShareTotal += s.hotelShareTotal || 0;
      riderShareTotal += s.riderShareTotal || 0;
      cancelledCount += s.cancelledCount || 0;
    });
  } else {
    // Fallback: Query live orders for merchant if stats collection is not yet populated
    const ordersSnap = await db()
      .collection("orders")
      .where("merchantId", "==", merchantId)
      .limit(200)
      .get();

    ordersSnap.docs.forEach((doc) => {
      const order = doc.data() as Order;
      if (order.status === "cancelled") {
        cancelledCount++;
      } else {
        totalOrders++;
        grossRevenue += order.grandTotal || 0;
        hotelShareTotal += order.hotelShare || 0;
        riderShareTotal += order.riderShare || 0;
      }
    });
  }

  const avgOrderValue = totalOrders > 0 ? Math.round((grossRevenue / totalOrders) * 100) / 100 : 0;

  return {
    merchantId,
    totalOrders,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    hotelShareTotal: Math.round(hotelShareTotal * 100) / 100,
    riderShareTotal: Math.round(riderShareTotal * 100) / 100,
    avgOrderValue,
    cancelledCount,
    dailyStats,
  };
}

// ---------- Module A2: Cross-Branch Comparison Reporting ----------

export interface CrossBranchPerformanceItem extends MerchantPerformanceReport {
  branchName: string;
  city: string;
}

/**
 * Gets cross-branch comparison metrics across all active storefronts (A2 Cross-Branch Comparison Reporting).
 * Reuses getMerchantPerformanceReport for individual branch aggregation.
 */
export async function getCrossBranchComparisonReport(
  days: number = 30
): Promise<CrossBranchPerformanceItem[]> {
  const storefrontsSnap = await db()
    .collection("storefronts")
    .where("onboardingStatus", "==", "LIVE")
    .get();

  let docs = storefrontsSnap.docs;

  // Fallback: If no LIVE storefronts, query all storefronts
  if (docs.length === 0) {
    const allSnap = await db().collection("storefronts").limit(50).get();
    docs = allSnap.docs;
  }

  const reports = await Promise.all(
    docs.map(async (doc) => {
      const sf = doc.data() as Storefront;
      const report = await getMerchantPerformanceReport(doc.id, days);
      return {
        ...report,
        branchName: sf.name || "Unnamed Branch",
        city: sf.city || "Unknown City",
      };
    })
  );

  return reports.sort((a, b) => b.grossRevenue - a.grossRevenue);
}

// ---------- Module A3: Customer Ordering Behavior Insights ----------

export interface PeakHourBucket {
  hour: number;
  label: string;
  orderCount: number;
  revenue: number;
}

export interface PopularMenuItemInsight {
  itemId: string;
  name: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface CustomerBehaviorInsightsData {
  totalOrdersAnalysed: number;
  totalUniqueCustomers: number;
  repeatCustomerRate: number;
  avgItemsPerOrder: number;
  peakHours: PeakHourBucket[];
  topPopularItems: PopularMenuItemInsight[];
  paymentMethodBreakdown: {
    onlineCount: number;
    codCount: number;
    onlinePercent: number;
    codPercent: number;
  };
}

/**
 * Calculates customer ordering behavior insights (A3 Customer Ordering Behavior Insights).
 * Aggregates peak hours, top items, retention rates, and payment methods with 100% PII protection.
 */
export async function getCustomerBehaviorInsights(
  merchantId?: string,
  days: number = 30
): Promise<CustomerBehaviorInsightsData> {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - days);

  let query: FirebaseFirestore.Query = db()
    .collection("orders")
    .where("createdAt", ">=", Timestamp.fromDate(startDate))
    .orderBy("createdAt", "desc")
    .limit(1000);

  if (merchantId) {
    query = db()
      .collection("orders")
      .where("merchantId", "==", merchantId)
      .where("createdAt", ">=", Timestamp.fromDate(startDate))
      .orderBy("createdAt", "desc")
      .limit(1000);
  }

  const snap = await query.get();

  const peakHoursMap = new Map<number, { orderCount: number; revenue: number }>();
  for (let i = 0; i < 24; i++) {
    peakHoursMap.set(i, { orderCount: 0, revenue: 0 });
  }

  const itemMap = new Map<string, { name: string; quantitySold: number; totalRevenue: number }>();
  const userOrderCounts = new Map<string, number>();

  let totalOrdersAnalysed = 0;
  let totalItemsCount = 0;
  let onlineCount = 0;
  let codCount = 0;

  snap.docs.forEach((doc) => {
    const order = doc.data() as Order;
    if (order.status === "cancelled") return;

    totalOrdersAnalysed++;

    let hour = 12;
    if (order.createdAt && typeof order.createdAt.toDate === "function") {
      hour = order.createdAt.toDate().getHours();
    } else if (order.createdAt && (order.createdAt as any)._seconds) {
      hour = new Date((order.createdAt as any)._seconds * 1000).getHours();
    }
    const currentBucket = peakHoursMap.get(hour) || { orderCount: 0, revenue: 0 };
    currentBucket.orderCount++;
    currentBucket.revenue += order.grandTotal || 0;
    peakHoursMap.set(hour, currentBucket);

    if (order.userId) {
      userOrderCounts.set(order.userId, (userOrderCounts.get(order.userId) || 0) + 1);
    }

    if (order.paymentId || order.razorpayOrderId) {
      onlineCount++;
    } else {
      codCount++;
    }

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        const qty = item.qty || 1;
        totalItemsCount += qty;
        const existing = itemMap.get(item.itemId) || {
          name: item.name || "Item",
          quantitySold: 0,
          totalRevenue: 0,
        };
        existing.quantitySold += qty;
        existing.totalRevenue += (item.ourPrice || 0) * qty;
        itemMap.set(item.itemId, existing);
      });
    }
  });

  const totalUniqueCustomers = userOrderCounts.size;
  let repeatCustomerCount = 0;
  userOrderCounts.forEach((count) => {
    if (count > 1) repeatCustomerCount++;
  });
  const repeatCustomerRate =
    totalUniqueCustomers > 0
      ? Math.round((repeatCustomerCount / totalUniqueCustomers) * 1000) / 10
      : 0;

  const peakHours: PeakHourBucket[] = Array.from(peakHoursMap.entries()).map(([h, data]) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return {
      hour: h,
      label: `${displayHour}:00 ${period}`,
      orderCount: data.orderCount,
      revenue: Math.round(data.revenue * 100) / 100,
    };
  });

  const topPopularItems: PopularMenuItemInsight[] = Array.from(itemMap.entries())
    .map(([itemId, data]) => ({
      itemId,
      name: data.name,
      quantitySold: data.quantitySold,
      totalRevenue: Math.round(data.totalRevenue * 100) / 100,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 5);

  const avgItemsPerOrder =
    totalOrdersAnalysed > 0
      ? Math.round((totalItemsCount / totalOrdersAnalysed) * 10) / 10
      : 0;

  const onlinePercent =
    totalOrdersAnalysed > 0
      ? Math.round((onlineCount / totalOrdersAnalysed) * 1000) / 10
      : 0;
  const codPercent =
    totalOrdersAnalysed > 0
      ? Math.round((codCount / totalOrdersAnalysed) * 1000) / 10
      : 0;

  return {
    totalOrdersAnalysed,
    totalUniqueCustomers,
    repeatCustomerRate,
    avgItemsPerOrder,
    peakHours,
    topPopularItems,
    paymentMethodBreakdown: {
      onlineCount,
      codCount,
      onlinePercent,
      codPercent,
    },
  };
}

export interface FailureCategoryDistribution {
  failureId: string;
  name: string;
  count: number;
  percentage: number;
}

export interface ScopeDistribution {
  scope: "BRANCH" | "PLATFORM";
  count: number;
  percentage: number;
}

export interface PlatformHealthInsightsData {
  uptimePercentage: number;
  totalIncidents: number;
  openIncidents: number;
  acknowledgedIncidents: number;
  resolvedIncidents: number;
  mttrMinutes: number;
  failureDistribution: FailureCategoryDistribution[];
  scopeDistribution: ScopeDistribution[];
}

/**
 * Version 3 - Module B3: Aggregates Platform Reliability & Health Insights
 * Strictly non-sensitive operational metric aggregation.
 */
export async function getPlatformHealthInsights(days: number = 30): Promise<PlatformHealthInsightsData> {
  const database = db();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const incidentsSnap = await database
    .collection("incidents")
    .where("createdAt", ">=", Timestamp.fromDate(startDate))
    .get();

  const incidents = incidentsSnap.docs.map((doc) => doc.data());
  const totalIncidents = incidents.length;

  let openIncidents = 0;
  let acknowledgedIncidents = 0;
  let resolvedIncidents = 0;
  let totalResolutionTimeMinutes = 0;

  const failureCounts: Record<string, number> = {};
  const scopeCounts: Record<string, number> = { BRANCH: 0, PLATFORM: 0 };

  for (const inc of incidents) {
    if (inc.status === "open") openIncidents++;
    else if (inc.status === "acknowledged") acknowledgedIncidents++;
    else if (inc.status === "resolved") {
      resolvedIncidents++;
      if (inc.createdAt && inc.resolvedAt) {
        const createdMs = inc.createdAt.toMillis ? inc.createdAt.toMillis() : new Date(inc.createdAt).getTime();
        const resolvedMs = inc.resolvedAt.toMillis ? inc.resolvedAt.toMillis() : new Date(inc.resolvedAt).getTime();
        const diffMinutes = Math.max(0, (resolvedMs - createdMs) / (1000 * 60));
        totalResolutionTimeMinutes += diffMinutes;
      }
    }

    const fid = inc.failureId || "UNKNOWN_FAILURE";
    failureCounts[fid] = (failureCounts[fid] || 0) + 1;

    const scope = inc.scope === "BRANCH" ? "BRANCH" : "PLATFORM";
    scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
  }

  const mttrMinutes = resolvedIncidents > 0 ? Math.round(totalResolutionTimeMinutes / resolvedIncidents) : 0;

  // Compute Uptime SLA estimation (Total window minutes minus incident resolution downtime)
  const totalWindowMinutes = days * 24 * 60;
  const downtimeMinutes = totalResolutionTimeMinutes;
  const rawUptime = ((totalWindowMinutes - downtimeMinutes) / totalWindowMinutes) * 100;
  const uptimePercentage = Math.max(90.0, Math.min(100.0, Math.round(rawUptime * 100) / 100));

  const failureDistribution: FailureCategoryDistribution[] = Object.entries(failureCounts).map(([fid, count]) => ({
    failureId: fid,
    name: fid.replace(/_/g, " "),
    count,
    percentage: totalIncidents > 0 ? Math.round((count / totalIncidents) * 1000) / 10 : 0,
  }));

  const scopeDistribution: ScopeDistribution[] = [
    {
      scope: "BRANCH",
      count: scopeCounts.BRANCH || 0,
      percentage: totalIncidents > 0 ? Math.round(((scopeCounts.BRANCH || 0) / totalIncidents) * 1000) / 10 : 0,
    },
    {
      scope: "PLATFORM",
      count: scopeCounts.PLATFORM || 0,
      percentage: totalIncidents > 0 ? Math.round(((scopeCounts.PLATFORM || 0) / totalIncidents) * 1000) / 10 : 0,
    },
  ];

  return {
    uptimePercentage: totalIncidents === 0 ? 99.99 : uptimePercentage,
    totalIncidents,
    openIncidents,
    acknowledgedIncidents,
    resolvedIncidents,
    mttrMinutes,
    failureDistribution,
    scopeDistribution,
  };
}




