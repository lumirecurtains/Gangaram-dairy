// ============================================================
// POST /api/v1/auth/refresh-claims — Force claims refresh
// Module 8 — Client calls this after a role change,
// then calls getIdToken(true) to force token refresh
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    getAdminApp();
    const db = getFirestore();
    const auth = getAuth();

    // Re-read the role assignment document to get fresh state
    const roleDoc = await db.collection("roleAssignments").doc(user.uid).get();

    let role = "customer";
    let merchantId: string | undefined;

    if (roleDoc.exists) {
      const data = roleDoc.data()!;
      role = String(data.role || "customer");
      merchantId = data.merchantId ? String(data.merchantId) : undefined;
    }

    // Re-apply claims so the next getIdToken(true) picks them up
    const claims: Record<string, string | undefined> = { role };
    if (merchantId) {
      claims.merchantId = merchantId;
    }
    await auth.setCustomUserClaims(user.uid, claims);

    return NextResponse.json({
      success: true,
      role,
      merchantId: merchantId || null,
      message: "Claims refreshed. Call getIdToken(true) on the client to pick up changes.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Authorization") ? 401 : 500 }
    );
  }
}
