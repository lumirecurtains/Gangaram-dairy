// ============================================================
// POST /api/v1/admin/orders/force-cancel
// Module 6 — Super Admin Platform
// Module 18 — Sends order.cancelled notification to customer
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";
import { createNotification } from "@/lib/notify/createNotification";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const { orderId, reason } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const orderRef = db.collection("orders").doc(orderId);
    const snap = await orderRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = snap.data()!;
    const beforeState = { status: orderData.status };

    await orderRef.update({
      status: "cancelled",
      cancelledByAdmin: admin.uid,
      cancellationReason: reason || "Force cancelled by admin",
      updatedAt: Timestamp.now(),
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "order.force-cancel",
      targetPath: `orders/${orderId}`,
      beforeState,
      afterState: { status: "cancelled", reason: reason || null },
    });

    // Module 18: Order cancelled notification
    if (orderData.userId) {
      createNotification({
        userId: orderData.userId,
        type: "order.cancelled",
        title: "Order Cancelled",
        body: `Your order #${orderId.slice(-8).toUpperCase()} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
        link: `/order/${orderId}`,
        metadata: { orderId, reason: reason || null },
      });
    }

    return NextResponse.json({ success: true, orderId, previousStatus: beforeState.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
