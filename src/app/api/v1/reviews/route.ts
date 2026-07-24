// ============================================================
// POST /api/v1/reviews — Submit Customer Review
// Module 13 — Reviews & Ratings
//
// Security:
//   - Auth required
//   - One review per order (checked via hasBeenReviewed flag)
//   - Order must belong to current user
//   - Order must be delivered
//   - Rating 1-5, comment max 500 chars
//   - Idempotent via Idempotency-Key header
//   - Rate limited to 5/hr per user
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;

    // Order must belong to the authenticated user
    if (orderData.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only delivered orders can be reviewed
    if (orderData.status !== "delivered") {
      return NextResponse.json({ error: "Only delivered orders can be reviewed" }, { status: 400 });
    }

    // Prevent duplicate review
    if (orderData.hasBeenReviewed) {
      return NextResponse.json({ error: "This order has already been reviewed" }, { status: 409 });
    }

    // Fetch user's display name for denormalization on the review document
    let userName: string | null = null;
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userName = userData?.name || null;
      }
    } catch {
      // Silently fall back to null — reviews still work without a display name
    }

    // Create the review document with moderated status
    const reviewRef = db.collection("reviews").doc();
    const now = Timestamp.now();

    await db.runTransaction(async (tx) => {
      // Double-check hasBeenReviewed inside the transaction
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) return;
      const data = orderSnap.data()!;
      if (data.hasBeenReviewed) {
        throw new Error("ALREADY_REVIEWED");
      }

      tx.set(reviewRef, {
        orderId,
        merchantId: orderData.merchantId,
        userId: user.uid,
        userName,
        rating,
        comment: comment?.trim() || null,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      });

      // Mark the order as reviewed to prevent duplicates
      tx.update(orderRef, { hasBeenReviewed: true });
    });

    const result = { success: true, reviewId: reviewRef.id };

    await storeIdempotencyResult(idempotencyKey, user.uid, result);

    return NextResponse.json(result);
  } catch (err: any) {
    if (err.message === "ALREADY_REVIEWED") {
      return NextResponse.json({ error: "This order has already been reviewed" }, { status: 409 });
    }
    console.error("Review creation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
