// ============================================================
// POST /api/v1/admin/roles — Role management
// Module 6 + Module 8 — Full role lifecycle
// Actions: grant | revoke | promote | demote | assign_staff
//          | revoke_staff | assign_rider | revoke_rider
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

const VALID_ROLES = ["super_admin", "support_agent", "merchant_staff", "rider"] as const;

const VALID_ACTIONS = [
  "grant",
  "revoke",
  "promote",
  "demote",
  "assign_staff",
  "revoke_staff",
  "assign_rider",
  "revoke_rider",
] as const;

// In-memory rate limit: 1 operation per hour per caller UID
const rateLimitMap = new Map<string, number>();

function checkRateLimit(uid: string): boolean {
  const lastTime = rateLimitMap.get(uid);
  const now = Date.now();
  if (lastTime && now - lastTime < 60 * 60 * 1000) {
    return false;
  }
  rateLimitMap.set(uid, now);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    getAdminApp();
    const db = getFirestore();
    const auth = getAuth();

    // Idempotency-Key deduplication
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const existingKey = await db.collection("idempotencyKeys").doc(idempotencyKey).get();
      if (existingKey.exists) {
        return NextResponse.json(existingKey.data());
      }
    }

    const body = await request.json();
    const { targetUid, action, role, merchantId } = body;

    if (!targetUid || !action) {
      return NextResponse.json(
        { error: "targetUid and action are required" },
        { status: 400 }
      );
    }

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          error: `Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Rate limit
    if (!checkRateLimit(admin.uid)) {
      return NextResponse.json(
        { error: "Rate limited: 1 role operation per hour" },
        { status: 429 }
      );
    }

    
    // Fetch current user claims to preserve flags we aren't changing
    const userRecord = await auth.getUser(targetUid);
    const currentClaims = userRecord.customClaims || {};
    const newClaims = { ...currentClaims };

    // ---- grant: assign any role to a user ----
    if (action === "grant") {
      if (!role || !VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: `Valid role required for grant. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
      }

      newClaims[role] = true;
      if (role === "merchant_staff" && merchantId) {
        newClaims.merchantId = merchantId;
      }

      await auth.setCustomUserClaims(targetUid, newClaims);
      await db.collection("roleAssignments").doc(targetUid).set({
        [role]: true,
        merchantId: newClaims.merchantId || null,
        grantedBy: admin.uid,
        grantedAt: Timestamp.now(),
      }, { merge: true });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.grant",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role, merchantId: merchantId || null },
      });

      return NextResponse.json({ success: true, targetUid, action, role, merchantId: merchantId || null });
    }

    // ---- assign_staff: assign merchant_staff with merchantId ----
    if (action === "assign_staff") {
      if (!merchantId) {
        return NextResponse.json({ error: "merchantId is required for assign_staff" }, { status: 400 });
      }

      newClaims.merchant_staff = true;
      newClaims.merchantId = merchantId;

      await auth.setCustomUserClaims(targetUid, newClaims);
      await db.collection("roleAssignments").doc(targetUid).set({
        merchant_staff: true,
        merchantId,
        grantedBy: admin.uid,
        grantedAt: Timestamp.now(),
      }, { merge: true });

      return NextResponse.json({ success: true, targetUid, action: "assign_staff" });
    }

    // ---- revoke_staff: remove merchant_staff claim ----
    if (action === "revoke_staff") {
      newClaims.merchant_staff = false;
      newClaims.merchantId = null; // Important: Strip tenant ID when revoking staff

      await auth.setCustomUserClaims(targetUid, newClaims);
      await db.collection("roleAssignments").doc(targetUid).update({
        merchant_staff: false,
        merchantId: null,
        revokedAt: Timestamp.now(),
      });

      return NextResponse.json({ success: true, targetUid, action: "revoke_staff" });
    }

    // ---- assign_rider: grant rider role ----
    if (action === "assign_rider") {
      newClaims.rider = true;

      await auth.setCustomUserClaims(targetUid, newClaims);
      await db.collection("roleAssignments").doc(targetUid).set({
        rider: true,
        grantedBy: admin.uid,
        grantedAt: Timestamp.now(),
      }, { merge: true });

      return NextResponse.json({ success: true, targetUid, action: "assign_rider" });
    }

    // ---- revoke_rider: remove rider claim ----
    if (action === "revoke_rider") {
      newClaims.rider = false;

      await auth.setCustomUserClaims(targetUid, newClaims);
      await db.collection("roleAssignments").doc(targetUid).update({
        rider: false,
        revokedAt: Timestamp.now(),
      });

      return NextResponse.json({ success: true, targetUid, action: "revoke_rider" });
    }

    // ---- revoke: legacy support, resets to customer ----
    if (action === "revoke") {
      await auth.setCustomUserClaims(targetUid, { role: "customer" });
      await db.collection("roleAssignments").doc(targetUid).update({
        revokedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.revoke",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: { role: body.role || "unknown" },
        afterState: { role: "customer" },
      });

      const result = { success: true, targetUid, action: "revoke" };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Roles API error:", err);
    return NextResponse.json(
      { error: message },
      {
        status:
          message.includes("Authorization") || message.includes("Forbidden") ? 403 : 500,
      }
    );
  }
}
