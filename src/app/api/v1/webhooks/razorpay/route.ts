// ============================================================
// POST /api/v1/webhooks/razorpay — Razorpay Webhook
// Module 3 — Handles payment.captured and payment.failed events
// Module 10 — Uses getDispatcher() pattern for merchant notify
// Module 18 — Sends payment.success / payment.failed notifications
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { notifyMerchantOnOrderPaid } from "@/lib/notify/merchantNotifier";
import { incrementDailyStats } from "@/lib/analytics/rollupWriter";
import { accrueLoyaltyPoints } from "@/lib/promotions/loyaltyAccrual";
import { recordCouponRedemption } from "@/lib/promotions/CouponRepository";
import { createNotification } from "@/lib/notify/createNotification";

export const maxDuration = 30;

async function createHmacSha256(data: string, secret: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", secret).update(data).digest("hex");
}

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

  if (orderData?.status !== "pending_payment") {
    return NextResponse.json({ status: "already_processed" });
  }

  const errorCode = (payment.error_code as string) ?? null;
  const errorDescription = (payment.error_description as string) ?? null;

  await orderDoc.ref.update({
    status: "payment_failed",
    paymentFailure: { errorCode, errorDescription, failedAt: Timestamp.now() },
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

  // Module 18: Payment failed notification
  if (orderData?.userId) {
    createNotification({
      userId: orderData.userId,
      type: "payment.failed",
      title: "Payment Failed",
      body: `Your payment of ₹${orderData.grandTotal} failed. ${errorDescription ? `Reason: ${errorDescription}` : "Please try again."}`,
      link: `/order/${orderDoc.id}`,
      metadata: { orderId: orderDoc.id, errorCode, errorDescription },
    });
  }

  console.warn(`Payment failed for order ${orderDoc.id}:`, errorCode, errorDescription);
  return NextResponse.json({ status: "ok" });
}

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

  if (orderData?.status !== "pending_payment") {
    return NextResponse.json({ status: "already_processed" });
  }

  await orderDoc.ref.update({ status: "paid", paymentId, updatedAt: Timestamp.now() });

  await db.collection("auditLogs").add({
    actorUid: "razorpay-webhook",
    action: "payment.captured",
    targetPath: `orders/${orderDoc.id}`,
    beforeState: { status: "pending_payment" },
    afterState: { status: "paid", paymentId },
    timestamp: Timestamp.now(),
  });

  // Module 18: Payment success notification
  if (orderData?.userId) {
    createNotification({
      userId: orderData.userId,
      type: "payment.success",
      title: "Payment Successful",
      body: `Your payment of ₹${orderData.grandTotal} was successful.`,
      link: `/order/${orderDoc.id}`,
      metadata: { orderId: orderDoc.id, paymentId },
    });
  }

  if (orderData?.couponCode && orderData?.userId) {
    try { await recordCouponRedemption(orderData.userId, orderData.couponCode); } catch (err) { console.error("Failed to record coupon redemption:", err); }
  }

  if (orderData?.merchantId) {
    notifyMerchantOnOrderPaid(orderDoc.id, orderData.merchantId).catch(console.error);
  }

  if (orderData) {
    const aggregatorPriceTotal = (orderData.items as Array<{ ourPrice: number; aggregatorPrice: number | null; qty: number }>)?.reduce(
      (sum: number, item) => sum + (item.aggregatorPrice ?? item.ourPrice) * item.qty, 0
    );
    const ourPriceTotal = (orderData.items as Array<{ ourPrice: number; qty: number }>)?.reduce(
      (sum: number, item) => sum + item.ourPrice * item.qty, 0
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

  if (orderData?.userId) {
    accrueLoyaltyPoints({ userId: orderData.userId, orderGrandTotal: orderData.grandTotal ?? 0 }).catch(console.error);
  }

  return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = request.headers.get("x-razorpay-signature");

    if (!webhookSecret) {
      if (process.env.NODE_ENV === "production") {
        console.error("RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook");
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
      }
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

    const orderId: string = payment.order_id || payment.receipt;

    switch (event) {
      case "payment.failed":
        return handlePaymentFailed(db, payment, orderId);
      case "payment.captured":
        return handlePaymentCaptured(db, payment, orderId, (payment.id as string) ?? "");
      default:
        return NextResponse.json({ status: "ignored" });
    }
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
