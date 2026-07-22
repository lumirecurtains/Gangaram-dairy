// ============================================================
// POST /api/v1/admin/orders/trigger-refund
// Module 6 — Super Admin Platform
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

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

    const beforeState = { status: snap.data()?.status, paymentId: snap.data()?.paymentId };
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

    return NextResponse.json({ success: true, orderId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
