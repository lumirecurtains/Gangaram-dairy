// ============================================================
// POST /api/v1/orders — Create Order
// Module 1/3 — Server computes ALL totals
// Module 18 — Creates "order.placed" notification
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

import * as crypto from "crypto";
import { getCoupon, getUserRedemptionCount } from "@/lib/promotions/CouponRepository";
import { validateCoupon } from "@/lib/promotions/validateCoupon";
import { checkMargin } from "@/lib/promotions/MarginGuard";
import { checkRateLimit } from "@/lib/security/rateLimiter";
import { resolveCouponEligibility } from "@/lib/promotions/resolvers/couponResolver";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";
import { createNotification } from "@/lib/notify/createNotification";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    getAdminApp();
    const db = getFirestore();

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) {
        return NextResponse.json({ error: "Request already processing" }, { status: 429 });
      }
      return NextResponse.json(idemResult.existingResult);
    }

    const rl = await checkRateLimit(user.uid, "orders:create");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    
    
    const { items, merchantId, deliveryAddress, couponCode } = body;

    // Validate request payload
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty or invalid" }, { status: 400 });
    }
    if (!merchantId) {
      return NextResponse.json({ error: "Merchant ID is required" }, { status: 400 });
    }
    if (!deliveryAddress || !deliveryAddress.flat || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode) {
      return NextResponse.json({ error: "Complete delivery address is required" }, { status: 400 });
    }

    // Validate items for duplicates, valid quantities, etc.
    const itemIds = new Set();
    for (const item of items) {
      if (!item.itemId || typeof item.itemId !== "string") {
        return NextResponse.json({ error: "Invalid item ID in payload" }, { status: 400 });
      }
      if (itemIds.has(item.itemId)) {
        return NextResponse.json({ error: "Duplicate items in payload" }, { status: 400 });
      }
      itemIds.add(item.itemId);

      const qty = item.qty || 1;
      if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0 || qty > 99) {
        return NextResponse.json({ error: `Invalid quantity for item ${item.itemId}` }, { status: 400 });
      }
    }

    // Generate secure 4-digit PIN


    const deliveryPin = crypto.randomInt(1000, 10000).toString();
    const salt = crypto.randomBytes(16).toString("hex");
    const deliveryPinHash = crypto
      .scryptSync(deliveryPin, salt, 64)
      .toString("hex");
    const storedHash = `${salt}:${deliveryPinHash}`;

        // Fetch actual menu prices from Firestore for server-side computation
    const merchantSnap = await db.collection("merchants").doc(merchantId).get();
    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }
    const merchantData = merchantSnap.data()!;

    const menuRef = db.collection(`merchants/${merchantId}/menus`);
    const itemPromises = items.map((i: { itemId: string }) =>
      menuRef.doc(i.itemId).get()
    );
    const itemDocs = await Promise.all(itemPromises);

    // Validate all items exist and are available
    let computedSubTotal = 0;
    let totalHotelProfit = 0;
    let totalBaseCost = 0;
    let aggregatorPriceTotal = 0;
    let ourPriceTotal = 0;
    let itemNames: string[] = [];

    const orderItems: Array<{
      itemId: string;
      name: string;
      qty: number;
      ourPrice: number;
      aggregatorPrice: number | null;
      baseCost: number;
      hotelProfit: number;
    }> = [];

    for (const [idx, doc] of itemDocs.entries()) {
      if (!doc.exists) {
        return NextResponse.json(
          { error: `Item ${items[idx].itemId} not found` },
          { status: 400 }
        );
      }
      const menuItem = doc.data()!;
      if (!menuItem.isAvailable) {
        return NextResponse.json(
          { error: `${menuItem.name} is currently unavailable` },
          { status: 400 }
        );
      }

      const qty = items[idx].qty || 1;
      const itemTotal = menuItem.ourPrice * qty;
      computedSubTotal += itemTotal;
      totalHotelProfit += menuItem.hotelProfit * qty;
      totalBaseCost += menuItem.baseCost * qty;
      aggregatorPriceTotal += (menuItem.aggregatorPrice || menuItem.ourPrice) * qty;
      ourPriceTotal += menuItem.ourPrice * qty;
      itemNames.push(`${qty}x ${menuItem.name}`);

      orderItems.push({
        itemId: items[idx].itemId,
        name: menuItem.name,
        qty,
        ourPrice: menuItem.ourPrice,
        aggregatorPrice: menuItem.aggregatorPrice,
        baseCost: menuItem.baseCost,
        hotelProfit: menuItem.hotelProfit,
      });
    }

    // Coupon validation
    let discountPercent = 0;
    if (couponCode) {
      const coupon = await getCoupon(couponCode);
      if (!coupon) {
        return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      }

      const userRedemptionCount = await getUserRedemptionCount(user.uid, couponCode);

      const couponValidation = validateCoupon(coupon, userRedemptionCount, Date.now());
      if (!couponValidation.valid) {
        return NextResponse.json({ error: couponValidation.reason }, { status: 400 });
      }

      // Merchant scope check
      if (coupon.merchantId !== null && coupon.merchantId !== merchantId) {
        return NextResponse.json({ error: "Coupon not valid for this merchant" }, { status: 400 });
      }

      // Smart Coupon scope validation (first_order, returning_customer, time_window, product, combo, category)
      const ordersSnap = await db.collection("orders")
        .where("userId", "==", user.uid)
        .limit(1)
        .get();
      const isFirstOrder = ordersSnap.empty;

      const cartCategories = [...new Set(
        itemDocs
          .filter(d => d.exists)
          .map(d => d.data()!.category as string | undefined)
          .filter((c): c is string => Boolean(c))
      )];

      const scopeResult = resolveCouponEligibility(coupon as any, {
        userId: user.uid,
        isFirstOrder,
        cartItems: orderItems.map(o => ({
          itemId: o.itemId,
          name: o.name,
          qty: o.qty,
          ourPrice: o.ourPrice,
          aggregatorPrice: o.aggregatorPrice,
          baseCost: o.baseCost,
          hotelProfit: o.hotelProfit,
        })),
        cartCategories,
        currentTimeMs: Date.now(),
      });

      if (!scopeResult.eligible) {
        return NextResponse.json({ error: scopeResult.reason || "Coupon scope requirements not met" }, { status: 400 });
      }

      const hotelShareBeforeDiscount = computedSubTotal * 0.7; // Hardcoded 70/30 split logic
      const marginCheck = checkMargin({
        hotelShare: hotelShareBeforeDiscount,
        discountPercent: couponValidation.discountPercent || 0,
        minimumProfitFloor: merchantData.minimumProfitFloor || 0,
      });

      if (!marginCheck.allowed) {
        return NextResponse.json({ error: marginCheck.reason }, { status: 400 });
      }

      discountPercent = couponValidation.discountPercent || 0;
    }

    // Compute final totals
    const discountAmount = Math.floor(computedSubTotal * (discountPercent / 100));
    const netSubTotal = computedSubTotal - discountAmount;
    const deliveryFee = 30;
    const riderShare = deliveryFee;
    const hotelShare = Math.round(netSubTotal * 0.7);
    const grandTotal = netSubTotal + deliveryFee;

    // Create order
    const now = Timestamp.now();
    const order = {
      userId: user.uid,
      merchantId,
      riderId: null,
      items: orderItems,
      status: "pending_payment" as const,
      deliveryAddress,
      subTotal: computedSubTotal,
      deliveryFee,
      hotelShare,
      riderShare,
      grandTotal,
      razorpayOrderId: null,
      paymentId: null,
      couponCode: couponCode || null,
      discountPercent,
      deliveryPinHash: storedHash,
      failedPinAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    const orderRef = await db.collection("orders").add(order);
    await orderRef.collection("private").doc("secrets").set({ deliveryPin });

    const finalResponse = {
      orderId: orderRef.id,
      subTotal: computedSubTotal,
      deliveryFee,
      hotelShare,
      riderShare,
      grandTotal,
      razorpayOrderId: null,
      deliveryPin,
    };

    await storeIdempotencyResult(idempotencyKey, user.uid, finalResponse);

    // Module 18: Order Placed notification
    const itemsStr = itemNames.slice(0, 3).join(", ") + (itemNames.length > 3 ? ` +${itemNames.length - 3} more` : "");
    createNotification({
      userId: user.uid,
      type: "order.placed",
      title: "Order Placed",
      body: `Your order of ${itemsStr} has been placed successfully.`,
      link: `/order/${orderRef.id}`,
      metadata: { orderId: orderRef.id, merchantId },
    });

    return NextResponse.json(finalResponse);
  } catch (err: unknown) {
    console.error("Order creation error:", err);
    if (err instanceof Error) {
      if (err.message.includes("Authorization") || err.message.includes("Forbidden")) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      if (err.message.startsWith("Item") || err.message.includes("unavailable")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: "Failed to create order due to an internal error." },
      { status: 500 }
    );
  }
}
