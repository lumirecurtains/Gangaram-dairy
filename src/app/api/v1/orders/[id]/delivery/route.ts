// ============================================================
// POST /api/v1/orders/[id]/delivery — Driver Delivery Ops
// Module 5 — Accept job, mark delivered with proof
//
// RACE CONDITION FIX: Both ACCEPT_JOB and MARK_DELIVERED now
// use Firestore runTransaction to atomically read and update
// order state, preventing two riders from claiming the same
// job or marking an already-reassigned order as delivered.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

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
      return NextResponse.json(
        { error: "Forbidden: only riders can use this endpoint" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, proofDataString } = body;

    if (!action || !["ACCEPT_JOB", "MARK_DELIVERED"].includes(action)) {
      return NextResponse.json(
        { error: "action must be ACCEPT_JOB or MARK_DELIVERED" },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();
    const orderRef = db.collection("orders").doc(id);

    // ---- ACCEPT_JOB: assign rider to a ready order ----
    // Uses runTransaction to prevent race conditions when multiple
    // riders attempt to claim the same job simultaneously.
    if (action === "ACCEPT_JOB") {
      const result = await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists) {
          throw new Error("NOT_FOUND");
        }

        const orderData = orderSnap.data()!;

        // Validate current state
        if (orderData.status !== "ready") {
          throw new Error(
            `Cannot accept job: order is in '${orderData.status}' state, expected 'ready'`
          );
        }

        // Already assigned to this rider — idempotent
        if (orderData.riderId === user.uid) {
          return {
            status: "noop",
            orderId: id,
            currentStatus: orderData.status,
            riderId: user.uid,
          };
        }

        // Already assigned to another rider
        if (orderData.riderId && orderData.riderId !== user.uid) {
          throw new Error("ALREADY_CLAIMED");
        }

        // Atomically claim the job — within the transaction,
        // no other rider can interleave between read and write.
        transaction.update(orderRef, {
          riderId: user.uid,
          status: "out_for_delivery",
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          status: "updated",
          orderId: id,
          action: "ACCEPT_JOB",
          riderId: user.uid,
          currentStatus: "out_for_delivery",
        };
      });

      return NextResponse.json(result);
    }

    // ---- MARK_DELIVERED: complete the delivery with proof ----
    if (action === "MARK_DELIVERED") {
      const result = await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists) {
          throw new Error("NOT_FOUND");
        }

        const orderData = orderSnap.data()!;

        // Validate current state
        if (orderData.status !== "out_for_delivery") {
          throw new Error(
            `Cannot deliver: order is in '${orderData.status}' state, expected 'out_for_delivery'`
          );
        }

        // Rider must be assigned to this order
        if (orderData.riderId !== user.uid && !user.isSuperAdmin) {
          throw new Error("UNAUTHORIZED_RIDER");
        }

        // Idempotent: if already delivered
        if (orderData.status === "delivered") {
          return {
            status: "noop",
            orderId: id,
            currentStatus: "delivered",
          };
        }

        const updateData: Record<string, unknown> = {
          status: "delivered",
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Accept Base64 proof image string if provided
        if (proofDataString && typeof proofDataString === "string") {
          if (
            proofDataString.startsWith("data:image/") ||
            proofDataString.startsWith("data:application/octet-stream")
          ) {
            updateData.deliveryProofUrl = proofDataString;
          } else {
            updateData.deliveryProofUrl = proofDataString;
          }
        }

        transaction.update(orderRef, updateData);

        return {
          status: "updated",
          orderId: id,
          action: "MARK_DELIVERED",
          currentStatus: "delivered",
          proofCaptured: !!proofDataString,
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Delivery operation error:", err);

    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (err.message?.startsWith("Cannot accept job") || err.message?.startsWith("Cannot deliver")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err.message === "ALREADY_CLAIMED") {
      return NextResponse.json(
        { error: "This order is already assigned to another rider" },
        { status: 409 }
      );
    }
    if (err.message === "UNAUTHORIZED_RIDER") {
      return NextResponse.json(
        { error: "This order is assigned to another rider" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}