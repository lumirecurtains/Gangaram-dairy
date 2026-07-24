// ============================================================
// POST /api/v1/admin/orders/trigger-refund
// Module 6 — Super Admin Platform
// Module 18 — Sends refund.initiated notification to customer
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
    const { orderId } = await request.json();

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
    const beforeState = { status: orderData.status, paymentId: orderData.paymentId };

    await orderRef.update({
      status: "refunded",
      refundedAt: Timestamp.now(),
      refundedBy: admin.uid,
      updatedAt: Timestamp.now(),
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "order.trigger-refund",
      targetPath: `orders/${orderId}`,
      beforeState,
      afterState: { status: "refunded" },
    });

    // Module 18: Refund initiated notification
    if (orderData.userId) {
      createNotification({
        userId: orderData.userId,
        type: "refund.initiated",
        title: "Refund Initiated",
        body: `Your refund for order #${orderId.slice(-8).toUpperCase()} has been initiated. It may take 3-5 business days to reflect.`,
        link: `/order/${orderId}`,
        metadata: { orderId },
      });
    }

    return NextResponse.json({ success: true, orderId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
