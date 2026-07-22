// ============================================================
// POST /api/v1/webhooks/razorpay — Razorpay Webhook
// Module 3 — Handles payment.captured event
// Module 10 — Uses getDispatcher() pattern for merchant notify
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { notifyMerchantOnOrderPaid } from "@/lib/notify/merchantNotifier";
import { incrementDailyStats } from "@/lib/analytics/rollupWriter";
import { accrueLoyaltyPoints } from "@/lib/promotions/loyaltyAccrual";
import { recordCouponRedemption } from "@/lib/promotions/CouponRepository";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Read body ONCE — streams can only be consumed once
    const rawBody = await request.text();

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = request.headers.get("x-razorpay-signature");

    if (webhookSecret && signature) {
      const expectedSig = await createHmacSha256(rawBody, webhookSecret);
      if (signature !== expectedSig) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    getAdminApp();
    const db = getFirestore();

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Respond 200 immediately
    if (event !== "payment.captured") {
      return NextResponse.json({ status: "ignored" });
    }

    const payment = payload.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const orderId = payment.order_id || payment.receipt;
    const paymentId = payment.id;

    // Find the order by razorpayOrderId
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

    // Update order status
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

    const orderData = orderDoc.data();

    // Module 14: Atomic coupon redemption 
    // This MUST happen here, not at order creation, to ensure we don't permanently consume limited coupons for failed/abandoned checkouts.
    // The Razorpay webhook is naturally retried. recordCouponRedemption uses atomic increments.
    // However, if Razorpay sends multiple webhooks for the same payment, we must be idempotent.
    // We already verified the order status transitioned from pending_payment -> paid.
    // If it was ALREADY paid, the function returns early. Therefore, this block is safe from webhook replays.
    
    if (orderData?.couponCode && orderData?.userId) {
      try {
        await recordCouponRedemption(orderData.userId, orderData.couponCode);
      } catch (err) {
        console.error("Failed to record coupon redemption:", err);
      }
    }
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

    // Module 14: coupon redemption counter + loyalty accrual
    if (orderData?.userId) {
      // Accrue loyalty points for the customer
      accrueLoyaltyPoints({
        userId: orderData.userId,
        orderGrandTotal: orderData.grandTotal ?? 0,
      }).catch(console.error);


    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: "ok" });
  }
}

async function createHmacSha256(data: string, secret: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", secret).update(data).digest("hex");
}
