// ============================================================
// RATE LIMITER — Gangaram Security Layer
// Module 9 — Tracks per-user, per-endpoint rate limits
// Module 10 Scalability — Uses FieldValue.increment() to avoid lock contention
// ============================================================

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "orders:create": { maxRequests: 10, windowMinutes: 60 },
  "orders:status-update": { maxRequests: 60, windowMinutes: 60 },
  "onboarding:draft": { maxRequests: 3, windowMinutes: 60 },
  "reviews:submit": { maxRequests: 5, windowMinutes: 60 },
  "ai:recommendations": { maxRequests: 50, windowMinutes: 60 },
  "ai:chat": { maxRequests: 10, windowMinutes: 60 },
};

export async function checkRateLimit(
  uid: string,
  endpointKey: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  getAdminApp();
  const db = getFirestore();

  const config = DEFAULT_LIMITS[endpointKey];
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  const counterId = `${uid}_${endpointKey}`;
  const counterRef = db.collection("rateLimitCounters").doc(counterId);
  const now = Timestamp.now();
  const nowMs = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;

  try {
    // Read the current state first (fast read)
    const snap = await counterRef.get();

    if (!snap.exists) {
      await counterRef.set({
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
      // Window expired — reset
      await counterRef.set({
        count: 1,
        windowStart: now,
        uid,
        endpoint: endpointKey,
      });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: nowMs + windowMs };
    }

    const currentCount = (data.count as number) || 0;

    if (currentCount >= config.maxRequests) {
      // Exceeded limit (no write needed)
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStartMs + windowMs,
      };
    }

    // Atomic increment without a transaction read-lock (highly scalable)
    await counterRef.update({ count: FieldValue.increment(1) });
    
    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: windowStartMs + windowMs,
    };
  } catch (err) {
    // Fail open
    console.error("Rate limit check failed, allowing through:", err);
    return { allowed: true, remaining: 1, resetAt: 0 };
  }
}

export async function resetRateLimit(uid: string, endpointKey: string): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  const counterId = `${uid}_${endpointKey}`;
  await db.collection("rateLimitCounters").doc(counterId).delete();
}
