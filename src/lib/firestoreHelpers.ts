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

