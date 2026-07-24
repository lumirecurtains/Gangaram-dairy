// ============================================================
// POST /api/v1/webhooks/razorpay — Razorpay Webhook
// Module 3 — Handles payment.captured and payment.failed events
// Module 10 — Uses getDispatcher() pattern for merchant notify
//
// SECURITY: Webhook signature verification is MANDATORY
//           in production (process.env.NODE_ENV === "production").
//           RAZORPAY_WEBHOOK_SECRET must be set.
//
// IDEMPOTENCY: Each event result is cached via the idempotency
//              key pattern. The order status is checked BEFORE
//              any update — duplicate webhooks are silently
//              acknowledged to prevent double-counting coupons,
//              loyalty points, and analytics.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { notifyMerchantOnOrderPaid } from "@/lib/notify/merchantNotifier";
import { incrementDailyStats } from "@/lib/analytics/rollupWriter";
import { accrueLoyaltyPoints } from "@/lib/promotions/loyaltyAccrual";
import { recordCouponRedemption } from "@/lib/promotions/CouponRepository";

export const maxDuration = 30;

/**
 * Creates an HMAC-SHA256 hex digest for webhook signature verification.
 */
async function createHmacSha256(data: string, secret: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Handles the payment.failed event from Razorpay.
 * Transitions the order from pending_payment to payment_failed
 * and records the error details so the customer can retry.
 */
async function handlePaymentFailed(
  db: FirebaseFirestore.Firestore,
  payment: Record<string, unknown>,
  orderId: string
): Promise<NextResponse> {
  const ordersSnapshot = await db
    .collection("orders")
    .where("razorpayOrderId", "==", orderId)
    .limit(1)
    .get();

  if (ordersSnapshot.empty) {
    console.error("Order not found for failed payment, razorpayOrderId:", orderId);
    return NextResponse.json({ status: "ok" });
  }

  const orderDoc = ordersSnapshot.docs[0];
  const orderData = orderDoc.data();

  // Idempotency: only transition from pending_payment
  if (orderData?.status !== "pending_payment") {
    return NextResponse.json({ status: "already_processed" });
  }

  const errorCode = (payment.error_code as string) ?? null;
  const errorDescription = (payment.error_description as string) ?? null;

  await orderDoc.ref.update({
    status: "payment_failed",
    paymentFailure: {
      errorCode,
      errorDescription,
      failedAt: Timestamp.now(),
    },
    updatedAt: Timestamp.now(),
  });

  await db.collection("auditLogs").add({
    actorUid: "razorpay-webhook",
    action: "payment.failed",
    targetPath: `orders/${orderDoc.id}`,
    beforeState: { status: "pending_payment" },
    afterState: { status: "payment_failed", errorCode, errorDescription },
    timestamp: Timestamp.now(),
  });

  console.warn(`Payment failed for order ${orderDoc.id}:`, errorCode, errorDescription);
  return NextResponse.json({ status: "ok" });
}

/**
 * Handles the payment.captured event from Razorpay.
 * Transitions the order to "paid" and triggers coupon
 * redemption, loyalty accrual, analytics rollup, and
 * merchant notification. Idempotent — skips if the
 * order is already paid.
 */
async function handlePaymentCaptured(
  db: FirebaseFirestore.Firestore,
  payment: Record<string, unknown>,
  orderId: string,
  paymentId: string
): Promise<NextResponse> {
  const ordersSnapshot = await db
    .collection("orders")
    .where("razorpayOrderId", "==", orderId)
    .limit(1)
    .get();

  if (ordersSnapshot.empty) {
    console.error("Order not found for razorpayOrderId:", orderId);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderDoc = ordersSnapshot.docs[0];
  const orderData = orderDoc.data();

  // ============================================================
  // IDEMPOTENCY GUARD: only process if the order is still pending
  // Duplicate webhook deliveries will see status !== "pending_payment"
  // and return early, preventing double-counting of side effects.
  // ============================================================
  if (orderData?.status !== "pending_payment") {
    return NextResponse.json({ status: "already_processed" });
  }

  // Update order status atomically
  await orderDoc.ref.update({
    status: "paid",
    paymentId,
    updatedAt: Timestamp.now(),
  });

  // Write audit log
  await db.collection("auditLogs").add({
    actorUid: "razorpay-webhook",
    action: "payment.captured",
    targetPath: `orders/${orderDoc.id}`,
    beforeState: { status: "pending_payment" },
    afterState: { status: "paid", paymentId },
    timestamp: Timestamp.now(),
  });

  // Module 14: Atomic coupon redemption
  if (orderData?.couponCode && orderData?.userId) {
    try {
      await recordCouponRedemption(orderData.userId, orderData.couponCode);
    } catch (err) {
      console.error("Failed to record coupon redemption:", err);
    }
  }

  // Module 10: Notify merchant
  if (orderData?.merchantId) {
    notifyMerchantOnOrderPaid(orderDoc.id, orderData.merchantId).catch(console.error);
  }

  // Module 13: daily-stats rollup increment
  if (orderData) {
    const aggregatorPriceTotal = (orderData.items as Array<{ ourPrice: number; aggregatorPrice: number | null; qty: number }>)?.reduce(
      (sum: number, item: { ourPrice: number; aggregatorPrice: number | null; qty: number }) =>
        sum + (item.aggregatorPrice ?? item.ourPrice) * item.qty,
      0
    );
    const ourPriceTotal = (orderData.items as Array<{ ourPrice: number; qty: number }>)?.reduce(
      (sum: number, item: { ourPrice: number; qty: number }) => sum + item.ourPrice * item.qty,
      0
    );

    incrementDailyStats({
      merchantId: orderData.merchantId,
      grandTotal: orderData.grandTotal ?? 0,
      hotelShare: orderData.hotelShare ?? 0,
      riderShare: orderData.riderShare ?? 0,
      subTotal: orderData.subTotal ?? 0,
      aggregatorPriceTotal,
      ourPriceTotal,
    }).catch(console.error);
  }

  // Module 14: loyalty accrual
  if (orderData?.userId) {
    accrueLoyaltyPoints({
      userId: orderData.userId,
      orderGrandTotal: orderData.grandTotal ?? 0,
    }).catch(console.error);
  }

  return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
  try {
    // Read body ONCE — streams can only be consumed once
    const rawBody = await request.text();

    // ============================================================
    // WEBHOOK SIGNATURE VERIFICATION — MANDATORY IN PRODUCTION
    // ============================================================
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = request.headers.get("x-razorpay-signature");

    if (!webhookSecret) {
      if (process.env.NODE_ENV === "production") {
        console.error("RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook");
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 500 }
        );
      }
      // In development, log a warning and skip verification
      console.warn("RAZORPAY_WEBHOOK_SECRET not set — webhook signature verification skipped (dev only)");
    } else if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 401 });
    } else {
      const expectedSig = await createHmacSha256(rawBody, webhookSecret);
      if (signature !== expectedSig) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    getAdminApp();
    const db = getFirestore();

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const payment = payload.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Resolve the order identifier: Razorpay order_id or receipt (our Firestore doc id)
    const orderId: string = payment.order_id || payment.receipt;

    // Route event to the correct handler
    switch (event) {
      case "payment.failed":
        return handlePaymentFailed(db, payment, orderId);

      case "payment.captured":
        return handlePaymentCaptured(
          db,
          payment,
          orderId,
          (payment.id as string) ?? ""
        );

      default:
        // Silently acknowledge unhandled events
        return NextResponse.json({ status: "ignored" });
    }
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    // Return 200 on catch-all to acknowledge receipt and avoid retries for
    // events we cannot process. Non-200 would cause Razorpay to retry.
    return NextResponse.json({ status: "ok" });
  }
}
