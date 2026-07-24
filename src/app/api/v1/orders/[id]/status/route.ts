// ============================================================
// POST /api/v1/orders/[id]/status — Order Status Transitions
// Module 4 (staff) + Module 5 (rider) — Kitchen + Driver
// Module 18 — Sends status-change notifications
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { createNotification } from "@/lib/notify/createNotification";

const STAFF_TRANSITIONS: Record<string, string> = {
  paid: "preparing",
  preparing: "ready",
};

const RIDER_TRANSITIONS: Record<string, string> = {
  ready: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NOTIFICATION_MAP: Record<string, { type: string; title: string; body: (orderId: string) => string }> = {
  paid: { type: "order.accepted", title: "Order Accepted", body: (id) => `Order #${id.slice(-8).toUpperCase()} has been accepted by the restaurant.` },
  preparing: { type: "order.preparing", title: "Preparing Your Order", body: () => "The restaurant is preparing your food." },
  ready: { type: "order.ready", title: "Ready for Pickup", body: () => "Your order is ready for pickup." },
  out_for_delivery: { type: "order.out_for_delivery", title: "Out for Delivery", body: () => "Your order is on the way!" },
  delivered: { type: "order.delivered", title: "Delivered!", body: () => "Your order has been delivered. Enjoy your meal!" },
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
      return NextResponse.json({ error: "newStatus is required" }, { status: 400 });
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

    // Idempotency: if already at target status, return 200 no-op
    if (currentStatus === newStatus) {
      return NextResponse.json({ status: "noop", orderId: id, currentStatus });
    }

    // merchant_staff transitions: "paid" -> "preparing" -> "ready"
    if ((user.isSuperAdmin ? true : user.isMerchantStaff) && user.merchantId === orderData.merchantId) {
      const allowedNextStatus = STAFF_TRANSITIONS[currentStatus];
      if (!allowedNextStatus) {
        return NextResponse.json({ error: `Staff cannot transition from '${currentStatus}'` }, { status: 400 });
      }
      if (newStatus !== allowedNextStatus) {
        return NextResponse.json({ error: `Expected next status to be '${allowedNextStatus}', got '${newStatus}'` }, { status: 400 });
      }

      const update: Record<string, unknown> = { status: newStatus, updatedBy: user.uid, updatedAt: Timestamp.now() };
      if (newStatus === "preparing") update.acceptedAt = Timestamp.now();
      if (newStatus === "ready") update.readyAt = Timestamp.now();

      await orderRef.update(update);

      // Module 18: Notification
      const notif = NOTIFICATION_MAP[newStatus];
      if (notif && orderData.userId) {
        createNotification({
          userId: orderData.userId,
          type: notif.type,
          title: notif.title,
          body: notif.body(id),
          link: newStatus === "ready" ? `/track/${id}` : `/order/${id}`,
          metadata: { orderId: id },
        });
      }

      return NextResponse.json({ status: "updated", orderId: id, currentStatus: newStatus });
    }

    // Rider transitions: "ready" -> "out_for_delivery" -> "delivered"
    if ((user.isSuperAdmin ? true : user.isRider) && orderData.riderId === user.uid) {
      const allowedNextStatus = RIDER_TRANSITIONS[currentStatus];
      if (!allowedNextStatus) {
        return NextResponse.json({ error: `Rider cannot transition from '${currentStatus}'` }, { status: 400 });
      }
      if (newStatus !== allowedNextStatus) {
        return NextResponse.json({ error: `Expected next status to be '${allowedNextStatus}', got '${newStatus}'` }, { status: 400 });
      }

      const update: Record<string, unknown> = { status: newStatus, updatedBy: user.uid, updatedAt: Timestamp.now() };
      if (newStatus === "delivered") update.deliveredAt = Timestamp.now();

      await orderRef.update(update);

      // Module 18: Notification
      const notif = NOTIFICATION_MAP[newStatus];
      if (notif && orderData.userId) {
        createNotification({
          userId: orderData.userId,
          type: notif.type,
          title: notif.title,
          body: notif.body(id),
          link: `/track/${id}`,
          metadata: { orderId: id },
        });
      }

      return NextResponse.json({ status: "updated", orderId: id, currentStatus: newStatus });
    }

    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  } catch (err: any) {
    console.error("Status update error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
