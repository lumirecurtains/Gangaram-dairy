// ============================================================
// POST /api/v1/admin/merchants/billing — Update billing config
// Module 7 — Merchant Onboarding (super_admin only)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

const VALID_PLANS = ["BASIC", "PREMIUM", "ENTERPRISE"] as const;
const VALID_SUBSCRIPTION_STATUSES = ["ACTIVE", "PAST_DUE", "SUSPENDED"] as const;

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const { merchantId, subscriptionPlan, subscriptionStatus } = await request.json();

    if (!merchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    if (subscriptionPlan && !VALID_PLANS.includes(subscriptionPlan)) {
      return NextResponse.json(
        { error: `Invalid plan: ${subscriptionPlan}. Must be one of: ${VALID_PLANS.join(", ")}` },
        { status: 400 }
      );
    }

    if (subscriptionStatus && !VALID_SUBSCRIPTION_STATUSES.includes(subscriptionStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status: ${subscriptionStatus}. Must be one of: ${VALID_SUBSCRIPTION_STATUSES.join(", ")}`,
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

    const beforeData = merchantSnap.data()!;
    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedBy: admin.uid,
    };

    if (subscriptionPlan) {
      updateData.subscriptionPlan = subscriptionPlan;
    }
    if (subscriptionStatus) {
      updateData.subscriptionStatus = subscriptionStatus;
    }
    if (subscriptionPlan === "BASIC" && !beforeData.billingCycleAnchor) {
      updateData.billingCycleAnchor = Timestamp.now();
    }

    await merchantRef.update(updateData);

    await writeAuditLog({
      actorUid: admin.uid,
      action: "merchant.billing-update",
      targetPath: `merchants/${merchantId}`,
      beforeState: {
        subscriptionPlan: beforeData.subscriptionPlan || null,
        subscriptionStatus: beforeData.subscriptionStatus || null,
      },
      afterState: updateData,
    });

    return NextResponse.json({
      success: true,
      merchantId,
      updated: updateData,
    });
  } catch (err: any) {
    console.error("Merchant billing error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
