// ============================================================
// POST /api/v1/admin/reviews — Moderate Customer Reviews
// Module 13 — Reviews & Ratings
// Moderates PENDING reviews. Updates merchant/storefront average rating transactionally.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    // Only super_admin or support_agent can moderate reviews
    if (!user.isSuperAdmin && !user.isSupportAgent) {
      return NextResponse.json({ error: "Forbidden: Moderation access required" }, { status: 403 });
    }

    const { reviewId, action, moderationReason } = await request.json();

    if (!reviewId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "reviewId and valid action ('approve' | 'reject') are required" }, { status: 400 });
    }

    if (action === "reject" && !moderationReason) {
      return NextResponse.json({ error: "moderationReason is required when rejecting a review" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const reviewRef = db.collection("reviews").doc(reviewId);

    const result = await db.runTransaction(async (tx) => {
      const reviewSnap = await tx.get(reviewRef);
      if (!reviewSnap.exists) throw new Error("NOT_FOUND");
      
      const reviewData = reviewSnap.data()!;
      if (reviewData.status !== "PENDING" && reviewData.status !== "REJECTED") {
         // Prevent double-counting ratings by preventing re-approval of already APPROVED reviews
         throw new Error("ALREADY_PROCESSED");
      }

      const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
      if (reviewData.status === newStatus) {
         throw new Error("ALREADY_PROCESSED");
      }

      const merchantRef = db.collection("merchants").doc(reviewData.merchantId);
      const storefrontRef = db.collection("storefronts").doc(reviewData.merchantId);
      
      const merchantSnap = await tx.get(merchantRef);
      if (!merchantSnap.exists) throw new Error("MERCHANT_NOT_FOUND");

      const merchantData = merchantSnap.data()!;

      tx.update(reviewRef, {
        status: newStatus,
        moderatedBy: user.uid,
        moderationReason: moderationReason || null,
        updatedAt: Timestamp.now(),
      });

      // We only calculate aggregate ratings if the action is an APPROVAL.
      // (Rejections just hide it, we don't recalculate because it was never counted).
      if (newStatus === "APPROVED") {
        const currentCount = merchantData.reviewCount || 0;
        const currentAvg = merchantData.averageRating || 0;
        
        const newCount = currentCount + 1;
        // Mathematical moving average: ((old_avg * old_count) + new_rating) / new_count
        const newAvg = ((currentAvg * currentCount) + reviewData.rating) / newCount;
        const roundedAvg = Math.round(newAvg * 10) / 10;

        tx.update(merchantRef, {
          reviewCount: newCount,
          averageRating: roundedAvg,
        });

        tx.update(storefrontRef, {
          reviewCount: newCount,
          averageRating: roundedAvg,
        });
      }

      return { merchantId: reviewData.merchantId, rating: reviewData.rating };
    });

    await writeAuditLog({
      actorUid: user.uid,
      action: `reviews.${action}`,
      targetPath: `reviews/${reviewId}`,
      beforeState: { status: "PENDING" },
      afterState: { status: action === "approve" ? "APPROVED" : "REJECTED", moderationReason: moderationReason || null },
    });

    return NextResponse.json({ success: true, reviewId, action });

  } catch (err: any) {
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (err.message === "ALREADY_PROCESSED") return NextResponse.json({ error: "Review has already been processed" }, { status: 409 });
    if (err.message === "MERCHANT_NOT_FOUND") return NextResponse.json({ error: "Associated merchant not found" }, { status: 404 });

    console.error("Review moderation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
