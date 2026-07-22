// ============================================================
// GET /api/v1/admin/backups/request-restore-token
// Module 6 — Super Admin Platform
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);

    const token = generateToken();
    const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000); // 15 min expiry

    getAdminApp();
    const db = getFirestore();
    await db.collection("restoreTokens").doc(token).set({
      requestedBy: admin.uid,
      createdAt: Timestamp.now(),
      expiresAt,
      used: false,
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "backup.request-restore-token",
      targetPath: "backups/restore",
      beforeState: null,
      afterState: { tokenGenerated: true },
    });

    return NextResponse.json({ token, expiresAt: expiresAt.toMillis() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
