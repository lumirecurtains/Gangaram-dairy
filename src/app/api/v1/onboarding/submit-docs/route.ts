// ============================================================
// POST /api/v1/onboarding/submit-docs — Submit merchant docs
// Module 7 — Merchant Onboarding
// DEC-001 — Certificate Upload Support
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";
import { validateFssaiNumber } from "@/lib/onboarding/fssaiValidator";
import { validateGstNumber } from "@/lib/onboarding/gstValidator";
import { getFirebaseStorage } from "@/lib/firebase";
import { uploadCertificate } from "@/lib/storage/certificateUpload";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    const formData = await request.formData();
    
    const merchantId = formData.get("merchantId") as string;
    const fssaiNumber = formData.get("fssaiNumber") as string;
    const gstNumber = formData.get("gstNumber") as string;
    const fssaiCertificate = formData.get("fssaiCertificate") as File;
    const gstCertificate = formData.get("gstCertificate") as File;
    const geoFence = formData.get("geoFence") as string | null;
    const billing = formData.get("billing") as string | null;

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

    if (merchantData.onboardingStatus !== "DRAFT") {
      return NextResponse.json(
        { error: `Cannot submit docs: merchant is in '${merchantData.onboardingStatus}' state` },
        { status: 400 }
      );
    }

    if (!fssaiCertificate || !gstCertificate) {
      return NextResponse.json(
        { error: "Both FSSAI and GST certificates are required" },
        { status: 400 }
      );
    }

    if (fssaiNumber) {
      const fssaiResult = validateFssaiNumber(fssaiNumber);
      if (!fssaiResult.valid) {
        return NextResponse.json(
          { error: `FSSAI validation failed: ${fssaiResult.reason}` },
          { status: 400 }
        );
      }
    }

    if (gstNumber) {
      const gstResult = validateGstNumber(gstNumber);
      if (!gstResult.valid) {
        return NextResponse.json(
          { error: `GST validation failed: ${gstResult.reason}` },
          { status: 400 }
        );
      }
    }

    const storage = getFirebaseStorage();
    
    const fssaiUpload = await uploadCertificate({
      storage,
      merchantId,
      certificateType: "fssai",
      file: fssaiCertificate,
    });

    if (!fssaiUpload.success || !fssaiUpload.downloadUrl) {
      return NextResponse.json(
        { error: `FSSAI certificate upload failed: ${fssaiUpload.error}` },
        { status: 500 }
      );
    }

    const gstUpload = await uploadCertificate({
      storage,
      merchantId,
      certificateType: "gst",
      file: gstCertificate,
    });

    if (!gstUpload.success || !gstUpload.downloadUrl) {
      return NextResponse.json(
        { error: `GST certificate upload failed: ${gstUpload.error}` },
        { status: 500 }
      );
    }

    const updateData: Record<string, unknown> = {
      onboardingStatus: "PENDING_VERIFICATION",
      updatedAt: Timestamp.now(),
      fssaiCertificateUrl: fssaiUpload.downloadUrl,
      gstCertificateUrl: gstUpload.downloadUrl,
    };

    if (fssaiNumber) updateData.fssaiNumber = fssaiNumber;
    if (gstNumber) updateData.gstNumber = gstNumber;
    if (geoFence) updateData.geoFence = JSON.parse(geoFence);
    if (billing) updateData.billing = JSON.parse(billing);

    await merchantRef.update(updateData);

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
        hasFssaiCertificate: true,
        hasGstCertificate: true,
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
