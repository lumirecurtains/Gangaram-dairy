// ============================================================
// PUT /api/v1/reviews/[id] — Update Review
// Module 13 — Allows a customer to edit their own review
//
// Security:
//   - Auth required
//   - Only the review owner can update
//   - Rating validated 1-5
//   - Comment max 500 chars
//   - Status reset to PENDING for re-moderation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";
import { checkRateLimit } from "@/lib/security/rateLimiter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyAuth(request);
    const { id } = await params;

    // Idempotency key prevents duplicate update submissions
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) {
        return NextResponse.json({ error: "Request already processing" }, { status: 429 });
      }
      return NextResponse.json(idemResult.existingResult);
    }

    // Rate limit: 5 review updates per hour
    const rl = await checkRateLimit(user.uid, "reviews:submit");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { rating, comment } = await request.json();

    // Validate rating
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 });
    }

    // Validate comment
    if (typeof comment === "string" && comment.trim().length > 500) {
      return NextResponse.json({ error: "Review must be under 500 characters" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const reviewRef = db.collection("reviews").doc(id);
    const reviewSnap = await reviewRef.get();

    if (!reviewSnap.exists) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const reviewData = reviewSnap.data()!;

    // Ownership check
    if (reviewData.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized: you can only edit your own reviews" }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      rating,
      updatedAt: Timestamp.now(),
      status: "PENDING" as const,
    };

    // Only update comment if provided
    if (comment !== undefined) {
      updateData.comment = typeof comment === "string" ? comment.trim() : null;
    }

    await reviewRef.update(updateData);

    const result = { success: true, reviewId: id };

    await storeIdempotencyResult(idempotencyKey, user.uid, result);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Review update error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
