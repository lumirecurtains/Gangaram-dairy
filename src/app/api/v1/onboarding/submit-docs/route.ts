// ============================================================
// POST /api/v1/onboarding/submit-docs — Submit merchant docs
// Module 7 — Merchant Onboarding
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";
import { validateFssaiNumber } from "@/lib/onboarding/fssaiValidator";
import { validateGstNumber } from "@/lib/onboarding/gstValidator";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const { merchantId, fssaiNumber, gstNumber, geoFence, billing } = await request.json();

    if (!merchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const merchantRef = db.collection("merchants").doc(merchantId);
    const merchantSnap = await merchantRef.get();

    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchantData = merchantSnap.data()!;

    if (merchantData.ownerUid !== user.uid && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: You do not own this application" }, { status: 403 });
    }

    // Enforce state machine: only DRAFT can submit docs
    if (merchantData.onboardingStatus !== "DRAFT") {
      return NextResponse.json(
        { error: `Cannot submit docs: merchant is in '${merchantData.onboardingStatus}' state` },
        { status: 400 }
      );
    }

    // Validate FSSAI if provided
    if (fssaiNumber) {
      const fssaiResult = validateFssaiNumber(fssaiNumber);
      if (!fssaiResult.valid) {
        return NextResponse.json(
          { error: `FSSAI validation failed: ${fssaiResult.reason}` },
          { status: 400 }
        );
      }
    }

    // Validate GST if provided
    if (gstNumber) {
      const gstResult = validateGstNumber(gstNumber);
      if (!gstResult.valid) {
        return NextResponse.json(
          { error: `GST validation failed: ${gstResult.reason}` },
          { status: 400 }
        );
      }
    }

    // Update merchant doc
    const updateData: Record<string, unknown> = {
      onboardingStatus: "PENDING_VERIFICATION",
      updatedAt: Timestamp.now(),
    };

    if (fssaiNumber) updateData.fssaiNumber = fssaiNumber;
    if (gstNumber) updateData.gstNumber = gstNumber;
    if (geoFence) updateData.geoFence = geoFence;
    if (billing) updateData.billing = billing;

    await merchantRef.update(updateData);

    // Update storefront status
    await db.collection("storefronts").doc(merchantId).update({
      onboardingStatus: "PENDING_VERIFICATION",
      updatedAt: Timestamp.now(),
    });

    await writeAuditLog({
      actorUid: user.uid,
      action: "onboarding.submit-docs",
      targetPath: `merchants/${merchantId}`,
      beforeState: { onboardingStatus: "DRAFT" },
      afterState: {
        onboardingStatus: "PENDING_VERIFICATION",
        hasFssai: !!fssaiNumber,
        hasGst: !!gstNumber,
      },
    });

    return NextResponse.json({
      success: true,
      merchantId,
      onboardingStatus: "PENDING_VERIFICATION",
      validations: {
        fssai: fssaiNumber ? validateFssaiNumber(fssaiNumber) : null,
        gst: gstNumber ? validateGstNumber(gstNumber) : null,
      },
    });
  } catch (err: any) {
    console.error("Submit docs error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
