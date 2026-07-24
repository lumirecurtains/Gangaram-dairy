// ============================================================
// POST /api/v1/payments/create-order — Razorpay Order
// Module 3 — Creates Razorpay order with Route transfers
//
// SECURITY: Idempotency-Key header is REQUIRED. This prevents
//           duplicate Razorpay orders from being created for the
//           same Firestore order + user combination.
//
// SECURITY: Rate-limited to 5 requests per user per 60 minutes
//           to prevent abuse.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";
import { checkRateLimit } from "@/lib/security/rateLimiter";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    // ============================================================
    // IDEMPOTENCY GUARD
    // Prevents duplicate Razorpay order creation for the same
    // idempotency key. The frontend generates a unique key per
    // payment attempt (crypto.randomUUID()).
    // ============================================================
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required" },
        { status: 400 }
      );
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) {
        return NextResponse.json(
          { error: "Request already processing" },
          { status: 429 }
        );
      }
      return NextResponse.json(idemResult.existingResult);
    }

    // ============================================================
    // RATE LIMIT
    // Max 5 payment order creations per user per 60 minutes.
    // ============================================================
    const rl = await checkRateLimit(user.uid, "payments:create-order");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before retrying." },
        { status: 429 }
      );
    }

    getAdminApp();
    const db = getFirestore();

    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // Get the order
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;

    // Verify ownership
    if (orderData.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify status — only pending_payment or payment_failed orders can be paid
    if (orderData.status !== "pending_payment" && orderData.status !== "payment_failed") {
      return NextResponse.json(
        { error: `Order is already ${orderData.status}` },
        { status: 400 }
      );
    }

    // Check if Razorpay order already exists (secondary idempotency on the order itself)
    if (orderData.razorpayOrderId) {
      const responseData = {
        razorpayOrderId: orderData.razorpayOrderId,
        amount: orderData.grandTotal,
        orderId: orderRef.id,
      };
      await storeIdempotencyResult(idempotencyKey, user.uid, responseData);
      return NextResponse.json(responseData);
    }

    // Verify merchant has Razorpay account
    const merchantSnap = await db.collection("merchants").doc(orderData.merchantId).get();
    const merchantData = merchantSnap.data();
    if (!merchantData?.razorpayAccountId) {
      return NextResponse.json(
        { error: "MERCHANT_NOT_PAYOUT_READY: Restaurant is not set up for payments yet" },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId: string;

    if (razorpayKeyId && razorpayKeySecret) {
      // Real Razorpay API call
      const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          amount: Math.round(orderData.grandTotal * 100), // paise
          currency: "INR",
          receipt: orderRef.id,
          notes: {
            merchantId: orderData.merchantId,
            userId: user.uid,
          },
          // Route transfers
          transfers: [
            {
              account: merchantData.razorpayAccountId,
              amount: Math.round(orderData.hotelShare * 100),
              currency: "INR",
              notes: { type: "hotel_share" },
            },
            {
              account: process.env.RAZORPAY_PLATFORM_ACCOUNT_ID || "",
              amount: Math.round(orderData.riderShare * 100),
              currency: "INR",
              notes: { type: "rider_share" },
            },
          ],
        }),
      });

      if (!razorpayRes.ok) {
        const errData = await razorpayRes.json();
        throw new Error(`Razorpay error: ${errData.error?.description || "Unknown"}`);
      }

      const razorpayData = await razorpayRes.json();
      razorpayOrderId = razorpayData.id;
    } else {
      // Mock for development
      razorpayOrderId = `order_dev_${Date.now()}_${orderRef.id.slice(0, 8)}`;
    }

    // Save razorpayOrderId to order
    await orderRef.update({ razorpayOrderId, updatedAt: Timestamp.now() });

    const responseData = {
      razorpayOrderId,
      amount: orderData.grandTotal,
      orderId: orderRef.id,
    };

    await storeIdempotencyResult(idempotencyKey, user.uid, responseData);

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("Payment create-order error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
