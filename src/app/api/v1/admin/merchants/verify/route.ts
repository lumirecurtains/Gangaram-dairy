// ============================================================
// POST /api/v1/admin/merchants/verify — Approve/reject merchant
// Module 7 — Merchant Onboarding
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const { merchantId, action, rejectionReason } = await request.json();

    if (!merchantId || !action) {
      return NextResponse.json({ error: "merchantId and action are required" }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const merchantRef = db.collection("merchants").doc(merchantId);
    const merchantSnap = await merchantRef.get();

    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchantData = merchantSnap.data()!;

    // Only PENDING_VERIFICATION can be verified
    if (merchantData.onboardingStatus !== "PENDING_VERIFICATION") {
      return NextResponse.json(
        { error: `Cannot verify: merchant is in '${merchantData.onboardingStatus}' state` },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "LIVE" : "REJECTED";
    const updateData: Record<string, unknown> = {
      onboardingStatus: newStatus,
      updatedAt: Timestamp.now(),
    };

    if (action === "reject" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await merchantRef.update(updateData);

    // Update storefront status
    const storefrontUpdate: Record<string, unknown> = {
      onboardingStatus: newStatus,
      updatedAt: Timestamp.now(),
    };
    if (action === "reject") {
      storefrontUpdate.isOnline = false;
    }
    await db.collection("storefronts").doc(merchantId).update(storefrontUpdate);

    await writeAuditLog({
      actorUid: admin.uid,
      action: `merchant.${action}`,
      targetPath: `merchants/${merchantId}`,
      beforeState: { onboardingStatus: "PENDING_VERIFICATION" },
      afterState: { onboardingStatus: newStatus, rejectionReason: rejectionReason || null },
    });

    return NextResponse.json({
      success: true,
      merchantId,
      onboardingStatus: newStatus,
      rejectionReason: action === "reject" ? (rejectionReason || null) : null,
    });
  } catch (err: any) {
    console.error("Merchant verify error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
