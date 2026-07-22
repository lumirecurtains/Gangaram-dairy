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

    // ---- grant: assign any role to a user ----
    if (action === "grant") {
      if (!role || !VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { error: `Valid role required for grant. Must be one of: ${VALID_ROLES.join(", ")}` },
          { status: 400 }
        );
      }

      const claims: Record<string, string> = { role };
      if (role === "merchant_staff" && merchantId) {
        claims.merchantId = merchantId;
      }

      await auth.setCustomUserClaims(targetUid, claims);
      await db.collection("roleAssignments").doc(targetUid).set({
        role,
        merchantId: merchantId || null,
        grantedBy: admin.uid,
        grantedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.grant",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role, merchantId: merchantId || null },
      });

      const result = { success: true, targetUid, action, role, merchantId: merchantId || null };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
    }

    // ---- promote: elevate customer to a privileged role ----
    if (action === "promote") {
      if (!role) {
        return NextResponse.json({ error: "role is required for promote" }, { status: 400 });
      }

      const claims: Record<string, string> = { role };
      if (role === "merchant_staff" && merchantId) {
        claims.merchantId = merchantId;
      }

      await auth.setCustomUserClaims(targetUid, claims);
      await db.collection("roleAssignments").doc(targetUid).set({
        role,
        merchantId: merchantId || null,
        grantedBy: admin.uid,
        grantedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.promote",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role, merchantId: merchantId || null },
      });

      const result = { success: true, targetUid, action: "promote", role, merchantId: merchantId || null };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
    }

    // ---- demote: reset a user back to customer ----
    if (action === "demote") {
      await auth.setCustomUserClaims(targetUid, { role: "customer" });
      await db.collection("roleAssignments").doc(targetUid).update({
        revokedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.demote",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role: "customer" },
      });

      const result = { success: true, targetUid, action: "demote", previousRole: "any" };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
    }

    // ---- assign_staff: assign merchant_staff with merchantId ----
    if (action === "assign_staff") {
      if (!merchantId) {
        return NextResponse.json({ error: "merchantId is required for assign_staff" }, { status: 400 });
      }

      await auth.setCustomUserClaims(targetUid, { role: "merchant_staff", merchantId });
      await db.collection("roleAssignments").doc(targetUid).set({
        role: "merchant_staff",
        merchantId,
        grantedBy: admin.uid,
        grantedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.assign_staff",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role: "merchant_staff", merchantId },
      });

      const result = { success: true, targetUid, action: "assign_staff", role: "merchant_staff", merchantId };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
    }

    // ---- revoke_staff: remove merchant_staff claim ----
    if (action === "revoke_staff") {
      await auth.setCustomUserClaims(targetUid, { role: "customer" });
      await db.collection("roleAssignments").doc(targetUid).update({
        revokedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.revoke_staff",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role: "customer" },
      });

      const result = { success: true, targetUid, action: "revoke_staff", previousRole: "merchant_staff" };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
    }

    // ---- assign_rider: grant rider role ----
    if (action === "assign_rider") {
      await auth.setCustomUserClaims(targetUid, { role: "rider" });
      await db.collection("roleAssignments").doc(targetUid).set({
        role: "rider",
        grantedBy: admin.uid,
        grantedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.assign_rider",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role: "rider" },
      });

      const result = { success: true, targetUid, action: "assign_rider", role: "rider" };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
    }

    // ---- revoke_rider: remove rider claim ----
    if (action === "revoke_rider") {
      await auth.setCustomUserClaims(targetUid, { role: "customer" });
      await db.collection("roleAssignments").doc(targetUid).update({
        revokedAt: Timestamp.now(),
      });

      await writeAuditLog({
        actorUid: admin.uid,
        action: "role.revoke_rider",
        targetPath: `roleAssignments/${targetUid}`,
        beforeState: null,
        afterState: { role: "customer" },
      });

      const result = { success: true, targetUid, action: "revoke_rider", previousRole: "rider" };
      if (idempotencyKey) {
        await db.collection("idempotencyKeys").doc(idempotencyKey).set({ result, createdAt: Timestamp.now() });
      }
      return NextResponse.json(result);
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
