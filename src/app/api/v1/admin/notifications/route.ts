// ============================================================
// POST /api/v1/admin/notifications — Broadcast notification
// Module 6 — Super Admin Platform
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";
import { getDispatcher } from "@/lib/dispatch/getDispatcher";
import type { DispatchJob } from "@/lib/dispatch/types";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const idempotencyKey = request.headers.get("Idempotency-Key") || `broadcast_${Date.now()}`;
    const idemResult = await claimIdempotencyKey(idempotencyKey, admin.uid);
    
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) {
        return NextResponse.json({ error: "Broadcast already processing" }, { status: 429 });
      }
      return NextResponse.json(idemResult.existingResult);
    }

    const { title, body, channel } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

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

    // We process synchronously inside the request.
    // SCALABILITY LIMITATION: Serverless execution timeouts (e.g. 15s on Vercel Hobby) 
    // strictly limit this bounded broadcast. We cap it to 500 users maximum to prevent 
    // catastrophic timeout drop-offs in the middle of a batch.
    const usersSnap = await db.collection("users").where("isBanned", "==", false).limit(500).get();
    
    const dispatcher = getDispatcher();
    const jobs: DispatchJob[] = [];
    const targetChannel = channel === "push" || channel === "whatsapp" || channel === "sms" ? `${channel}_notify` : "in_app_notify";

    for (const doc of usersSnap.docs) {
      jobs.push({
        id: `${notificationRef.id}_${doc.id}`, // Idempotent Job ID tied to the user and broadcast
        type: targetChannel as any,
        payload: {
          userId: doc.id,
          message: body,
          title: title,
        }
      });
    }

    // Dispatch concurrently
    await dispatcher.dispatchAll(jobs);

    await notificationRef.update({
      dispatched: true,
      recipientCount: jobs.length,
      completedAt: Timestamp.now(),
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "notifications.broadcast",
      targetPath: `adminNotifications/${notificationRef.id}`,
      beforeState: null,
      afterState: { title, body, channel: channel || "in_app", recipients: jobs.length },
    });

    const result = { success: true, notificationId: notificationRef.id, recipients: jobs.length };
    await storeIdempotencyResult(idempotencyKey, admin.uid, result);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
