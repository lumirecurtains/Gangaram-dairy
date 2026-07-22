// ============================================================
// POST /api/v1/orders/[id]/delivery/complete — Verify PIN & Deliver
// Module 5 — Server-side Delivery Verification
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import * as crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    
    // Authorization Check: Must be a rider
    if (!user.isRider) {
      return NextResponse.json({ error: "Forbidden: Rider access required" }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { deliveryPin } = body;

    if (!deliveryPin || typeof deliveryPin !== "string" || deliveryPin.length !== 4) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const orderRef = db.collection("orders").doc(orderId);

    // Run verification atomically
    const result = await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      
      if (!orderSnap.exists) {
        throw new Error("NOT_FOUND");
      }

      const orderData = orderSnap.data()!;

      // 1. Validate Ownership & Status
      if (orderData.riderId !== user.uid) {
        throw new Error("UNAUTHORIZED_RIDER");
      }
      if (orderData.status !== "out_for_delivery") {
        throw new Error("INVALID_STATE");
      }

      // 2. Validate Lockout
      if ((orderData.failedPinAttempts || 0) >= 5) {
        throw new Error("LOCKED_OUT");
      }

      // 3. Verify PIN Hash
      const storedHashStr = orderData.deliveryPinHash;
      if (!storedHashStr || !storedHashStr.includes(":")) {
        throw new Error("INTERNAL_CORRUPTION");
      }

      const [salt, storedHash] = storedHashStr.split(":");
      const hashBuffer = crypto.scryptSync(deliveryPin, salt, 64);
      const isMatch = crypto.timingSafeEqual(hashBuffer, Buffer.from(storedHash, "hex"));

      if (!isMatch) {
        // Increment failures atomically
        transaction.update(orderRef, {
          failedPinAttempts: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid
        });
        return { success: false, remainingAttempts: 5 - ((orderData.failedPinAttempts || 0) + 1) };
      }

      // 4. Success! Mark Delivered
      transaction.update(orderRef, {
        status: "delivered",
        deliveredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid
      });

      return { success: true };
    });

    if (!result.success) {
      if ((result.remainingAttempts || 0) <= 0) {
        return NextResponse.json({ error: "Maximum attempts reached. Order locked. Contact support." }, { status: 429 });
      }
      return NextResponse.json({ error: `Incorrect PIN. ${result.remainingAttempts} attempts remaining.` }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: "Order successfully delivered." });

  } catch (err: any) {
    console.error("Delivery completion error:", err);
    
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (err.message === "UNAUTHORIZED_RIDER") return NextResponse.json({ error: "You are not assigned to this delivery" }, { status: 403 });
    if (err.message === "INVALID_STATE") return NextResponse.json({ error: "Order is not out for delivery" }, { status: 400 });
    if (err.message === "LOCKED_OUT") return NextResponse.json({ error: "Maximum attempts reached. Order locked. Contact support." }, { status: 429 });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
