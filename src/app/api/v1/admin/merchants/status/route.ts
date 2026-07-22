// ============================================================
// POST /api/v1/admin/merchants/status — Merchant lifecycle
// Module 7 — Merchant Onboarding
// Actions: suspend | activate | freeze | unfreeze | delete (soft-delete)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

type StatusAction = "suspend" | "activate" | "freeze" | "unfreeze" | "delete";

const ACTION_MAP: Record<StatusAction, { onboardingStatus: string; extraFields: Record<string, unknown> }> = {
  suspend: {
    onboardingStatus: "SUSPENDED",
    extraFields: {},
  },
  activate: {
    onboardingStatus: "LIVE",
    extraFields: {},
  },
  freeze: {
    onboardingStatus: "FROZEN",
    extraFields: { isFrozen: true },
  },
  unfreeze: {
    onboardingStatus: "LIVE",
    extraFields: { isFrozen: false },
  },
  delete: {
    onboardingStatus: "DELETED",
    extraFields: { deletedAt: Timestamp.now() },
  },
};

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const { merchantId, action } = await request.json();

    if (!merchantId || !action) {
      return NextResponse.json({ error: "merchantId and action are required" }, { status: 400 });
    }

    if (!ACTION_MAP[action as StatusAction]) {
      return NextResponse.json(
        {
          error: `Invalid action: ${action}. Must be one of: ${Object.keys(ACTION_MAP).join(", ")}`,
        },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();
    const merchantRef = db.collection("merchants").doc(merchantId);
    const merchantSnap = await merchantRef.get();

    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchantData = merchantSnap.data()!;
    const config = ACTION_MAP[action as StatusAction];
    const beforeStatus = merchantData.onboardingStatus;

    const updateData: Record<string, unknown> = {
      onboardingStatus: config.onboardingStatus,
      updatedAt: Timestamp.now(),
      ...config.extraFields,
    };

    await merchantRef.update(updateData);

    // Update storefront status (except for freeze/unfreeze which are internal flags)
    if (action !== "freeze" && action !== "unfreeze") {
      const storefrontUpdate: Record<string, unknown> = {
        onboardingStatus: config.onboardingStatus,
        updatedAt: Timestamp.now(),
      };
      if (action === "delete") {
        storefrontUpdate.isOnline = false;
      }
      await db.collection("storefronts").doc(merchantId).update(storefrontUpdate);
    }

    await writeAuditLog({
      actorUid: admin.uid,
      action: `merchant.${action}`,
      targetPath: `merchants/${merchantId}`,
      beforeState: { onboardingStatus: beforeStatus },
      afterState: { onboardingStatus: config.onboardingStatus, ...config.extraFields },
    });

    return NextResponse.json({
      success: true,
      merchantId,
      previousStatus: beforeStatus,
      currentStatus: config.onboardingStatus,
      action,
    });
  } catch (err: any) {
    console.error("Merchant status error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
