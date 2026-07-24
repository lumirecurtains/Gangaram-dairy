// ============================================================
// POST /api/v1/orders/[id]/delivery/complete — Verify PIN & Deliver
// Module 5 — Server-side Delivery Verification
// Module 18 — Sends order.delivered notification on PIN verification
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";
import { createNotification } from "@/lib/notify/createNotification";
import * as crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);

    if (!user.isRider) {
      return NextResponse.json({ error: "Forbidden: Rider access required" }, { status: 403 });
    }

    const { id: orderId } = await params;

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) return NextResponse.json({ error: "Request already processing" }, { status: 429 });
      return NextResponse.json(idemResult.existingResult);
    }

    const body = await request.json();
    const { deliveryPin } = body;

    if (!deliveryPin || typeof deliveryPin !== "string" || deliveryPin.length !== 4) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const orderRef = db.collection("orders").doc(orderId);

    // Verify PIN atomically in transaction
    const result = await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new Error("NOT_FOUND");

      const orderData = orderSnap.data()!;

      if (orderData.status !== "out_for_delivery") {
        throw new Error(`Cannot deliver: order is in '${orderData.status}' state, expected 'out_for_delivery'`);
      }

      if (orderData.riderId !== user.uid) {
        throw new Error("UNAUTHORIZED_RIDER");
      }

      // Check lockout
      if ((orderData.failedPinAttempts || 0) >= 5) {
        throw new Error("LOCKED_OUT");
      }

      // Verify PIN hash
      const [salt, hash] = (orderData.deliveryPinHash || ":").split(":");
      const computedHash = crypto.scryptSync(deliveryPin, salt, 64).toString("hex");

      if (hash !== computedHash) {
        transaction.update(orderRef, {
          failedPinAttempts: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });

        const attempts = (orderData.failedPinAttempts || 0) + 1;
        const remaining = 5 - attempts;
        throw new Error(`INVALID_PIN:${remaining}`);
      }

      // PIN match — mark delivered
      transaction.update(orderRef, {
        status: "delivered",
        deliveredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Module 18: Delivered notification
      if (orderData.userId) {
        createNotification({
          userId: orderData.userId,
          type: "order.delivered",
          title: "Delivered!",
          body: "Your order has been delivered. Enjoy your meal!",
          link: `/order/${orderId}`,
          metadata: { orderId },
        });
      }

      return { status: "updated", orderId, currentStatus: "delivered" };
    });

    const finalResult = { success: true, orderId, currentStatus: "delivered" };
    await storeIdempotencyResult(idempotencyKey, user.uid, finalResult);

    return NextResponse.json(finalResult);
  } catch (err: any) {
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (err.message?.startsWith("Cannot deliver")) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err.message === "UNAUTHORIZED_RIDER") return NextResponse.json({ error: "Unauthorized: order assigned to another rider" }, { status: 403 });
    if (err.message === "LOCKED_OUT") return NextResponse.json({ error: "Too many failed PIN attempts. Contact admin." }, { status: 429 });
    if (err.message?.startsWith("INVALID_PIN")) {
      const remaining = err.message.split(":")[1];
      return NextResponse.json({ error: `Invalid PIN. ${remaining} attempts remaining.` }, { status: 400 });
    }
    console.error("Delivery complete error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
