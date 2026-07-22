// ============================================================
// POST /api/v1/cron/cleanup-idempotency-keys — Daily cleanup
// Module 9 — Security Layer
// Protected by CRON_SECRET header validation
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredIdempotencyKeys } from "@/lib/security/idempotencyGuard";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const rateLimitCleanup = request.headers.get("x-rate-limit-cleanup");

    if (cronSecret) {
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (token !== cronSecret) {
        console.error("Cleanup cron: unauthorized attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.warn("Cleanup cron: CRON_SECRET not configured, allowing anyway");
    }

    // Clean up expired idempotency keys
    const deletedCount = await cleanupExpiredIdempotencyKeys();

    // Clean up stale rate limit counters (entries older than 24 hours)
    let staleRateLimitsDeleted = 0;
    if (rateLimitCleanup !== "skip") {
      staleRateLimitsDeleted = await cleanupStaleRateLimitCounters();
    }

    return NextResponse.json({
      status: "ok",
      deletedIdempotencyKeys: deletedCount,
      deletedRateLimitCounters: staleRateLimitsDeleted,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Cleanup cron error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Deletes rate limit counter documents older than 24 hours.
 */
async function cleanupStaleRateLimitCounters(): Promise<number> {
  const { getAdminApp } = await import("@/lib/firebaseAdmin");
  const { getFirestore, Timestamp } = await import("firebase-admin/firestore");

  getAdminApp();
  const db = getFirestore();
  const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  const stale = await db
    .collection("rateLimitCounters")
    .where("windowStart", "<", cutoff)
    .get();

  if (stale.empty) return 0;

  const batch = db.batch();
  stale.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return stale.size;
}
