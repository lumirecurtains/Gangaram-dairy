// ============================================================
// POST /api/v1/orders/[id]/status — Order Status Transitions
// Module 4 (staff) + Module 5 (rider) — Kitchen + Driver
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

// Allowed transition map for merchant_staff
const STAFF_TRANSITIONS: Record<string, string> = {
  paid: "preparing",
  preparing: "ready",
};

// Allowed transition map for riders
const RIDER_TRANSITIONS: Record<string, string> = {
  ready: "out_for_delivery",
  out_for_delivery: "delivered",
};

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
    const { newStatus } = await request.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: "newStatus is required" },
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
    const currentStatus: string = orderData.status;

    // ---- Idempotency: if already at target status, return 200 no-op ----
    if (currentStatus === newStatus) {
      return NextResponse.json({
        status: "noop",
        orderId: id,
        currentStatus,
      });
    }

    // ---- merchant_staff transitions: "paid" -> "preparing" -> "ready" ----
    if (user.role === "merchant_staff") {
      if (user.merchantId !== orderData.merchantId) {
        return NextResponse.json(
          { error: "Forbidden: you do not manage this merchant" },
          { status: 403 }
        );
      }

      const expectedNext = STAFF_TRANSITIONS[currentStatus];
      if (!expectedNext || expectedNext !== newStatus) {
        return NextResponse.json(
          {
            error: `Invalid transition: cannot move from '${currentStatus}' to '${newStatus}'`,
            allowedTransitions: { paid: "preparing", preparing: "ready" },
          },
          { status: 400 }
        );
      }

      // Apply the status update
      await orderRef.update({
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        status: "updated",
        orderId: id,
        previousStatus: currentStatus,
        currentStatus: newStatus,
      });
    }

    // ---- rider transitions: "ready" -> "out_for_delivery" -> "delivered" ----
    if (user.role === "rider") {
      // Rider must be assigned to this order
      if (orderData.riderId && orderData.riderId !== user.uid) {
        return NextResponse.json(
          { error: "Forbidden: this order is assigned to another rider" },
          { status: 403 }
        );
      }

      const expectedNext = RIDER_TRANSITIONS[currentStatus];
      if (!expectedNext || expectedNext !== newStatus) {
        return NextResponse.json(
          {
            error: `Invalid transition: cannot move from '${currentStatus}' to '${newStatus}'`,
            allowedTransitions: { ready: "out_for_delivery", out_for_delivery: "delivered" },
          },
          { status: 400 }
        );
      }

      // Auto-assign rider on first pickup transition
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      // Assign riderId if not already set
      if (!orderData.riderId) {
        updateData.riderId = user.uid;
      }

      await orderRef.update(updateData);

      return NextResponse.json({
        status: "updated",
        orderId: id,
        previousStatus: currentStatus,
        currentStatus: newStatus,
      });
    }

    // ---- super_admin: any transition ----
    if (user.role === "super_admin") {
      await orderRef.update({
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        status: "updated",
        orderId: id,
        previousStatus: currentStatus,
        currentStatus: newStatus,
      });
    }

    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  } catch (err: any) {
    console.error("Order status update error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
