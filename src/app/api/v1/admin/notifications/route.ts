// ============================================================
// POST /api/v1/admin/notifications — Broadcast notification
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
    const { title, body, channel } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

    // This is a stub for now. Full notification dispatch comes in Module 12.
    // For now, it logs the intent and records it for future dispatch.

    getAdminApp();
    const db = getFirestore();
    const notificationRef = await db.collection("adminNotifications").add({
      title,
      body,
      channel: channel || "in_app",
      createdBy: admin.uid,
      createdAt: Timestamp.now(),
      dispatched: false,
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "notifications.broadcast",
      targetPath: `adminNotifications/${notificationRef.id}`,
      beforeState: null,
      afterState: { title, body, channel: channel || "in_app" },
    });

    return NextResponse.json({ success: true, notificationId: notificationRef.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
