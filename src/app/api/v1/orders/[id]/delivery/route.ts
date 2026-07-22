// ============================================================
// POST /api/v1/orders/[id]/delivery — Driver Delivery Ops
// Module 5 — Accept job, mark delivered with proof
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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

    if (user.role !== "rider" && user.role !== "super_admin") {
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
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;

    // ---- ACCEPT_JOB: assign rider to a ready order ----
    if (action === "ACCEPT_JOB") {
      if (orderData.status !== "ready") {
        return NextResponse.json(
          { error: `Cannot accept job: order is in '${orderData.status}' state, expected 'ready'` },
          { status: 400 }
        );
      }

      // Idempotent: if already assigned to this rider
      if (orderData.riderId === user.uid) {
        return NextResponse.json({
          status: "noop",
          orderId: id,
          currentStatus: orderData.status,
          riderId: user.uid,
        });
      }

      // Already assigned to another rider
      if (orderData.riderId && orderData.riderId !== user.uid) {
        return NextResponse.json(
          { error: "This order is already assigned to another rider" },
          { status: 409 }
        );
      }

      await orderRef.update({
        riderId: user.uid,
        status: "out_for_delivery",
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        status: "updated",
        orderId: id,
        action: "ACCEPT_JOB",
        riderId: user.uid,
        currentStatus: "out_for_delivery",
      });
    }

    // ---- MARK_DELIVERED: complete the delivery with proof ----
    if (action === "MARK_DELIVERED") {
      if (orderData.status !== "out_for_delivery") {
        return NextResponse.json(
          { error: `Cannot deliver: order is in '${orderData.status}' state, expected 'out_for_delivery'` },
          { status: 400 }
        );
      }

      if (orderData.riderId !== user.uid && user.role !== "super_admin") {
        return NextResponse.json(
          { error: "This order is assigned to another rider" },
          { status: 403 }
        );
      }

      // Idempotent: if already delivered
      if (orderData.status === "delivered") {
        return NextResponse.json({
          status: "noop",
          orderId: id,
          currentStatus: "delivered",
        });
      }

      const updateData: Record<string, unknown> = {
        status: "delivered",
        updatedAt: Timestamp.now(),
      };

      // Accept Base64 proof image string if provided
      if (proofDataString && typeof proofDataString === "string") {
        // Validate it looks like a Base64 image data URI
        if (proofDataString.startsWith("data:image/") || proofDataString.startsWith("data:application/octet-stream")) {
          updateData.deliveryProofUrl = proofDataString;
        } else {
          // Store as-is — could be a plain URL or raw Base64 without prefix
          updateData.deliveryProofUrl = proofDataString;
        }
      }

      await orderRef.update(updateData);

      return NextResponse.json({
        status: "updated",
        orderId: id,
        action: "MARK_DELIVERED",
        currentStatus: "delivered",
        proofCaptured: !!proofDataString,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Delivery operation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
