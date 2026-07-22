// ============================================================
// POST /api/v1/admin/customers/ban — Ban/unban customers
// Module 9 — Security Layer
// Super_admin toggles isBanned, bannedReason, bannedAt on /users/{id}
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const { targetUid, ban, reason } = await request.json();

    if (!targetUid || ban === undefined) {
      return NextResponse.json(
        { error: "targetUid and ban (boolean) are required" },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();
    const userRef = db.collection("users").doc(targetUid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const beforeState = {
      isBanned: userSnap.data()?.isBanned || false,
      bannedReason: userSnap.data()?.bannedReason || null,
    };

    if (ban) {
      // Ban the user
      await userRef.update({
        isBanned: true,
        bannedReason: reason || "Violation of terms",
        bannedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "customer.ban",
        targetPath: `users/${targetUid}`,
        beforeState,
        afterState: {
          isBanned: true,
          bannedReason: reason || "Violation of terms",
        },
      });

      return NextResponse.json({
        success: true,
        targetUid,
        action: "ban",
        reason: reason || "Violation of terms",
      });
    }

    // Unban the user
    await userRef.update({
      isBanned: false,
      bannedReason: null,
      bannedAt: null,
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: "customer.unban",
      targetPath: `users/${targetUid}`,
      beforeState,
      afterState: {
        isBanned: false,
        bannedReason: null,
      },
    });

    return NextResponse.json({
      success: true,
      targetUid,
      action: "unban",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Ban API error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
