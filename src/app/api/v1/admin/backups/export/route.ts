// ============================================================
// POST /api/v1/admin/backups/export
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

    getAdminApp();
    const db = getFirestore();
    const backupId = `backup_${Date.now()}`;

    // Record backup initiation
    await db.collection("backupHistory").doc(backupId).set({
      triggeredBy: admin.uid,
      gcsPath: `backups/${backupId}.json`,
      status: "in_progress",
      startedAt: Timestamp.now(),
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "backup.export",
      targetPath: `backupHistory/${backupId}`,
      beforeState: null,
      afterState: { status: "in_progress" },
    });

    return NextResponse.json({ success: true, backupId, status: "in_progress" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
