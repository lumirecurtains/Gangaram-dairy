// ============================================================
// GET & POST /api/v1/admin/onboarding
// FIX-001 — Admin Merchant Approval Workflow
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    getAdminApp();
    const db = getFirestore();

    const snapshot = await db
      .collection("merchants")
      .where("onboardingStatus", "==", "PENDING_VERIFICATION")
      .orderBy("createdAt", "desc")
      .get();

    const merchants = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ merchants });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);

    getAdminApp();
    const db = getFirestore();

    const body = await request.json();
    const { merchantId, action, rejectionReason } = body;

    if (!merchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json({ error: "rejectionReason is required for rejection" }, { status: 400 });
    }

    const merchantRef = db.collection("merchants").doc(merchantId);
    const merchantSnap = await merchantRef.get();

    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchantData = merchantSnap.data()!;
    const beforeState = {
      onboardingStatus: merchantData.onboardingStatus,
      rejectionReason: merchantData.rejectionReason,
    };

    const now = Timestamp.now();
    const updateData: Record<string, unknown> = {
      reviewedAt: now,
      reviewedBy: admin.uid,
      updatedAt: now,
    };

    if (action === "approve") {
      updateData.onboardingStatus = "LIVE";
    } else if (action === "reject") {
      updateData.onboardingStatus = "REJECTED";
      updateData.rejectionReason = rejectionReason;
    }

    await merchantRef.update(updateData);

    const storefrontRef = db.collection("storefronts").doc(merchantId);
    await storefrontRef.update({
      onboardingStatus: action === "approve" ? "LIVE" : "REJECTED",
      updatedAt: now,
    });

    await writeAuditLog({
      actorUid: admin.uid,
      action: `admin.onboarding.${action}`,
      targetPath: `merchants/${merchantId}`,
      beforeState,
      afterState: {
        onboardingStatus: action === "approve" ? "LIVE" : "REJECTED",
        rejectionReason: action === "reject" ? rejectionReason : null,
        reviewedAt: now,
        reviewedBy: admin.uid,
      },
    });

    return NextResponse.json({
      success: true,
      merchantId,
      onboardingStatus: action === "approve" ? "LIVE" : "REJECTED",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
