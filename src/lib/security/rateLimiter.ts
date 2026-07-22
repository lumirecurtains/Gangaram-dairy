// ============================================================
// RATE LIMITER — Gangaram Security Layer
// Module 9 — Tracks per-user, per-endpoint rate limits
// Stores counters in /rateLimitCounters/{uid}_{endpoint}
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "orders:create": { maxRequests: 10, windowMinutes: 60 },       // customers: 10 orders/hr
  "orders:status-update": { maxRequests: 60, windowMinutes: 60 }, // riders: 60 updates/hr
};

/**
 * Checks and increments a rate limit counter for a given uid + endpoint key.
 *
 * Returns:
 *  - allowed: true if under limit
 *  - remaining: number of remaining requests in the window
 *  - resetAt: timestamp (ms) when the window resets
 */
export async function checkRateLimit(
  uid: string,
  endpointKey: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  getAdminApp();
  const db = getFirestore();

  const config = DEFAULT_LIMITS[endpointKey];
  if (!config) {
    // No rate limit configured for this endpoint — allow through
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const counterId = `${uid}_${endpointKey}`;
  const counterRef = db.collection("rateLimitCounters").doc(counterId);
  const now = Timestamp.now();
  const nowMs = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;

  // Use Firestore transaction for atomic read-write
  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef);

      if (!snap.exists) {
        // First request in the window — create counter
        tx.set(counterRef, {
          count: 1,
          windowStart: now,
          uid,
          endpoint: endpointKey,
        });
        return { allowed: true, remaining: config.maxRequests - 1, resetAt: nowMs + windowMs };
      }

      const data = snap.data()!;
      const windowStartMs = data.windowStart?.toMillis?.() || nowMs;
      const elapsed = nowMs - windowStartMs;

      if (elapsed > windowMs) {
        // Window expired — reset counter
        tx.set(counterRef, {
          count: 1,
          windowStart: now,
          uid,
          endpoint: endpointKey,
        });
        return { allowed: true, remaining: config.maxRequests - 1, resetAt: nowMs + windowMs };
      }

      // Within the current window
      const currentCount = (data.count as number) || 0;

      if (currentCount >= config.maxRequests) {
        // Exceeded limit
        return {
          allowed: false,
          remaining: 0,
          resetAt: windowStartMs + windowMs,
        };
      }

      // Increment count
      tx.update(counterRef, { count: currentCount + 1 });
      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetAt: windowStartMs + windowMs,
      };
    });

    return result;
  } catch (err) {
    // If transaction fails, allow through (fail open)
    console.error("Rate limit check failed, allowing through:", err);
    return { allowed: true, remaining: 1, resetAt: 0 };
  }
}

/**
 * Resets a rate limit counter for a given uid + endpoint key.
 * Used by cleanup cron for stale entries.
 */
export async function resetRateLimit(uid: string, endpointKey: string): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  const counterId = `${uid}_${endpointKey}`;
  await db.collection("rateLimitCounters").doc(counterId).delete();
}
