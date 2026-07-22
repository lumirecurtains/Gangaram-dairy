// ============================================================
// POST /api/v1/orders — Create Order
// Module 1/3 — Server computes ALL totals
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

    const body = await request.json();
    const { items, merchantId, deliveryAddress } = body;

    // Validate required fields
    if (!items?.length || !merchantId || !deliveryAddress) {
      return NextResponse.json(
        { error: "Missing required fields: items, merchantId, deliveryAddress" },
        { status: 400 }
      );
    }

    if (!deliveryAddress.flat || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode) {
      return NextResponse.json(
        { error: "Incomplete delivery address" },
        { status: 400 }
      );
    }

    // Verify merchant exists
    const merchantSnap = await db.collection("merchants").doc(merchantId).get();
    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Compute totals server-side — NEVER trust client
    const subTotal = items.reduce(
      (sum: number, item: any) => sum + (item.ourPrice || 0) * (item.qty || 1),
      0
    );
    const deliveryFee = 30; // Flat fee, configurable later
    const afterDeliveryFee = subTotal - deliveryFee;
    const hotelShare = Math.round(afterDeliveryFee * 0.7 * 100) / 100;
    const riderShare = Math.round(afterDeliveryFee * 0.3 * 100) / 100;
    const grandTotal = Math.round((subTotal + deliveryFee) * 100) / 100;

    const now = Timestamp.now();

    const order = {
      userId: user.uid,
      merchantId,
      riderId: null,
      items: items.map((item: import("@/lib/firestoreSchema").OrderItem) => ({
        itemId: item.itemId,
        name: item.name,
        qty: item.qty || 1,
        ourPrice: item.ourPrice,
        aggregatorPrice: item.aggregatorPrice || null,
        baseCost: item.baseCost || 0,
        hotelProfit: item.hotelProfit || 0,
      })),
      status: "pending_payment",
      deliveryAddress: {
        flat: deliveryAddress.flat,
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        pincode: deliveryAddress.pincode,
        landmark: deliveryAddress.landmark || null,
      },
      subTotal,
      deliveryFee,
      hotelShare,
      riderShare,
      grandTotal,
      razorpayOrderId: null,
      paymentId: null,
      createdAt: now,
      updatedAt: now,
    };

    const orderRef = await db.collection("orders").add(order);

    return NextResponse.json({
      orderId: orderRef.id,
      subTotal,
      deliveryFee,
      hotelShare,
      riderShare,
      grandTotal,
      razorpayOrderId: null, // Will be created by payment module
    });
  } catch (err: any) {
    console.error("Order creation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}

