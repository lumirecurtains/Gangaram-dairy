// ============================================================
// POST /api/v1/admin/feature-flags
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
    const { flagName, enabled, rolloutPercent } = await request.json();

    if (!flagName || enabled === undefined) {
      return NextResponse.json({ error: "flagName and enabled are required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const flagRef = db.collection("featureFlags").doc(flagName);

    const beforeSnap = await flagRef.get();
    const beforeState: Record<string, unknown> | null = beforeSnap.exists ? (beforeSnap.data() as Record<string, unknown>) : null;

    await flagRef.set({
      enabled,
      rolloutPercent: rolloutPercent ?? (enabled ? 100 : 0),
      updatedBy: admin.uid,
      updatedAt: Timestamp.now(),
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "feature-flags.update",
      targetPath: `featureFlags/${flagName}`,
      beforeState,
      afterState: { enabled, rolloutPercent: rolloutPercent ?? (enabled ? 100 : 0) },
    });

    return NextResponse.json({ success: true, flagName, enabled, rolloutPercent: rolloutPercent ?? (enabled ? 100 : 0) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
