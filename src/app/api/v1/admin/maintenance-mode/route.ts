// ============================================================
// POST /api/v1/admin/maintenance-mode
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
    const { maintenanceMode, maintenanceMessage } = await request.json();

    if (maintenanceMode === undefined) {
      return NextResponse.json({ error: "maintenanceMode is required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();

    await db.collection("platformSettings").doc("global").set(
      {
        maintenanceMode,
        maintenanceMessage: maintenanceMessage || (maintenanceMode ? "We are under maintenance. Please check back shortly." : null),
        updatedAt: Timestamp.now(),
        updatedBy: admin.uid,
      },
      { merge: true }
    );

    await writeAuditLog({
      actorUid: admin.uid,
      action: "maintenance-mode.update",
      targetPath: "platformSettings/global",
      beforeState: null,
      afterState: { maintenanceMode, maintenanceMessage: maintenanceMessage || null },
    });

    return NextResponse.json({ success: true, maintenanceMode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
