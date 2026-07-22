// ============================================================
// POST /api/v1/admin/settings — Platform settings
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
    const body = await request.json();

    getAdminApp();
    const db = getFirestore();

    // Allowed settings fields
    const allowedFields = ["supportContactPhone", "supportEmail", "platformName", "deliveryFee"];
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now(), updatedBy: admin.uid };

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    await db.collection("platformSettings").doc("global").set(updateData, { merge: true });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "settings.update",
      targetPath: "platformSettings/global",
      beforeState: null,
      afterState: updateData,
    });

    return NextResponse.json({ success: true, updated: updateData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
