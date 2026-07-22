// ============================================================
// POST /api/v1/reviews — Submit Customer Review
// Module 13 — Reviews & Ratings
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";
import { checkRateLimit } from "@/lib/security/rateLimiter";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) return NextResponse.json({ error: "Request already processing" }, { status: 429 });
      return NextResponse.json(idemResult.existingResult);
    }

    const rl = await checkRateLimit(user.uid, "reviews:submit");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { orderId, rating, comment } = await request.json();

    if (!orderId || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Valid orderId and rating (1-5) are required" }, { status: 400 });
    }

    if (comment && typeof comment === "string" && comment.length > 500) {
      return NextResponse.json({ error: "Comment must be under 500 characters" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();

    const orderRef = db.collection("orders").doc(orderId);
    const result = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) throw new Error("NOT_FOUND");
      
      const orderData = orderSnap.data()!;
      if (orderData.userId !== user.uid) throw new Error("FORBIDDEN");
      if (orderData.status !== "delivered") throw new Error("NOT_DELIVERED");
      if (orderData.hasBeenReviewed === true) throw new Error("ALREADY_REVIEWED");

      const reviewRef = db.collection("reviews").doc();
      const now = Timestamp.now();

      tx.set(reviewRef, {
        orderId,
        merchantId: orderData.merchantId,
        userId: user.uid,
        rating: Math.floor(rating), // Sanitize
        comment: comment ? comment.trim() : null,
        status: "PENDING", // Super Admin/Support moderation required before calculating averages
        createdAt: now,
        updatedAt: now,
      });

      tx.update(orderRef, { hasBeenReviewed: true, updatedAt: now });

      return { reviewId: reviewRef.id, merchantId: orderData.merchantId };
    });

    const finalResponse = { success: true, reviewId: result.reviewId, status: "PENDING" };
    await storeIdempotencyResult(idempotencyKey, user.uid, finalResponse);

    return NextResponse.json(finalResponse);

  } catch (err: any) {
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "You do not own this order" }, { status: 403 });
    if (err.message === "NOT_DELIVERED") return NextResponse.json({ error: "Only delivered orders can be reviewed" }, { status: 400 });
    if (err.message === "ALREADY_REVIEWED") return NextResponse.json({ error: "Order has already been reviewed" }, { status: 409 });

    console.error("Review submit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
