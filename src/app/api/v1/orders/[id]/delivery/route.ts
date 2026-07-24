// ============================================================
// POST /api/v1/orders/[id]/delivery — Driver Delivery Ops
// Module 5 — Accept job, mark delivered with proof
// Module 18 — Sends rider.assigned notification on ACCEPT_JOB
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { createNotification } from "@/lib/notify/createNotification";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyAuth(request);
    const { id } = await params;

    if (!user.isRider && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: only riders can use this endpoint" }, { status: 403 });
    }

    const body = await request.json();
    const { action, proofDataString } = body;

    if (!action || !["ACCEPT_JOB", "MARK_DELIVERED"].includes(action)) {
      return NextResponse.json({ error: "action must be ACCEPT_JOB or MARK_DELIVERED" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const orderRef = db.collection("orders").doc(id);

    if (action === "ACCEPT_JOB") {
      const result = await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) throw new Error("NOT_FOUND");
        const orderData = orderSnap.data()!;

        if (orderData.status !== "ready") {
          throw new Error(`Cannot accept job: order is in '${orderData.status}' state, expected 'ready'`);
        }

        if (orderData.riderId === user.uid) {
          return { status: "noop", orderId: id, currentStatus: orderData.status, riderId: user.uid };
        }

        if (orderData.riderId && orderData.riderId !== user.uid) {
          throw new Error("ALREADY_CLAIMED");
        }

        transaction.update(orderRef, {
          riderId: user.uid,
          status: "out_for_delivery",
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Module 18: Rider assigned notification
        if (orderData.userId) {
          createNotification({
            userId: orderData.userId,
            type: "rider.assigned",
            title: "Delivery Partner Assigned",
            body: "A delivery partner has been assigned to your order.",
            link: `/track/${id}`,
            metadata: { orderId: id },
          });
        }

        return { status: "updated", orderId: id, action: "ACCEPT_JOB", riderId: user.uid, currentStatus: "out_for_delivery" };
      });

      return NextResponse.json(result);
    }

    if (action === "MARK_DELIVERED") {
      const result = await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) throw new Error("NOT_FOUND");
        const orderData = orderSnap.data()!;

        if (orderData.status !== "out_for_delivery") {
          throw new Error(`Cannot deliver: order is in '${orderData.status}' state, expected 'out_for_delivery'`);
        }

        if (orderData.riderId !== user.uid && !user.isSuperAdmin) {
          throw new Error("UNAUTHORIZED_RIDER");
        }

        const updateData: Record<string, unknown> = {
          status: "delivered",
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (proofDataString && typeof proofDataString === "string") {
          updateData.deliveryProofUrl = proofDataString;
        }

        transaction.update(orderRef, updateData);

        // Module 18: Delivered notification
        if (orderData.userId) {
          createNotification({
            userId: orderData.userId,
            type: "order.delivered",
            title: "Delivered!",
            body: "Your order has been delivered. Enjoy your meal!",
            link: `/order/${id}`,
            metadata: { orderId: id },
          });
        }

        return { status: "updated", orderId: id, action: "MARK_DELIVERED", currentStatus: "delivered", proofCaptured: !!proofDataString };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Delivery operation error:", err);
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (err.message?.startsWith("Cannot accept job") || err.message?.startsWith("Cannot deliver")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err.message === "ALREADY_CLAIMED") return NextResponse.json({ error: "This order is already assigned to another rider" }, { status: 409 });
    if (err.message === "UNAUTHORIZED_RIDER") return NextResponse.json({ error: "This order is assigned to another rider" }, { status: 403 });
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: err.message?.includes("Authorization") ? 401 : 500 });
  }
}
