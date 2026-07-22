// ============================================================
// POST /api/v1/payments/create-order — Razorpay Order
// Module 3 — Creates Razorpay order with Route transfers
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
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

    // Verify status
    if (orderData.status !== "pending_payment") {
      return NextResponse.json(
        { error: `Order is already ${orderData.status}` },
        { status: 400 }
      );
    }

    // Check if Razorpay order already exists (idempotent)
    if (orderData.razorpayOrderId) {
      return NextResponse.json({
        razorpayOrderId: orderData.razorpayOrderId,
        amount: orderData.grandTotal,
        orderId: orderRef.id,
      });
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

    // Create Razorpay order (in production, use razorpay SDK)
    // For now, return a mock razorpayOrderId since Razorpay keys may not be set up yet
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

    return NextResponse.json({
      razorpayOrderId,
      amount: orderData.grandTotal,
      orderId: orderRef.id,
    });
  } catch (err: any) {
    console.error("Payment create-order error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
