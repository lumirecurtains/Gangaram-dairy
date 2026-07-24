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

    // Generate secure 4-digit PIN
    const deliveryPin = crypto.randomInt(1000, 10000).toString();
    const salt = crypto.randomBytes(16).toString("hex");
    const deliveryPinHash = crypto
      .scryptSync(deliveryPin, salt, 64)
      .toString("hex");
    const storedHash = `${salt}:${deliveryPinHash}`;

    // Fetch actual menu prices from Firestore for server-side computation
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

      const hotelShareBeforeDiscount = totalHotelProfit;
      const marginCheck = checkMargin({
        hotelShare: hotelShareBeforeDiscount,
        discountPercent: couponValidation.discountPercent || 0,
        minimumProfitFloor: 0,
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
      subTotal,
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
  } catch (err: any) {
    console.error("Order creation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
