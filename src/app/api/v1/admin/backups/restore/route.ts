// ============================================================
// POST /api/v1/admin/backups/restore
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
    const { gcsPath, confirmToken } = await request.json();

    if (!gcsPath || !confirmToken) {
      return NextResponse.json({ error: "gcsPath and confirmToken are required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();

    // Verify restore token
    const tokenDoc = await db.collection("restoreTokens").doc(confirmToken).get();
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: "Invalid restore token" }, { status: 401 });
    }

    const tokenData = tokenDoc.data()!;
    if (tokenData.used) {
      return NextResponse.json({ error: "Restore token already used" }, { status: 410 });
    }

    const expiresAt = tokenData.expiresAt?.toMillis?.() || 0;
    if (Date.now() > expiresAt) {
      return NextResponse.json({ error: "Restore token expired" }, { status: 410 });
    }

    if (tokenData.requestedBy !== admin.uid) {
      return NextResponse.json({ error: "Restore token belongs to another admin" }, { status: 403 });
    }

    // Mark token as used
    await db.collection("restoreTokens").doc(confirmToken).update({ used: true });

    // Record restore in backup history
    const restoreId = `restore_${Date.now()}`;
    await db.collection("backupHistory").doc(restoreId).set({
      type: "restore",
      triggeredBy: admin.uid,
      gcsPath,
      status: "in_progress",
      startedAt: Timestamp.now(),
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "backup.restore",
      targetPath: `backupHistory/${restoreId}`,
      beforeState: null,
      afterState: { gcsPath, status: "in_progress" },
    });

    return NextResponse.json({ success: true, restoreId, status: "in_progress" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
