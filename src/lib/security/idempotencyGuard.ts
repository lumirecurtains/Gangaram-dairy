// ============================================================
// IDEMPOTENCY GUARD — Gangaram Security Layer
// Module 9 — Checks and stores idempotency keys
// Prevents duplicate processing of the same request
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface IdempotencyRecord {
  key: string;
  result: unknown;
  createdAt: FirebaseFirestore.Timestamp;
  ttl: FirebaseFirestore.Timestamp;
}

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Attempts to claim an idempotency key.
 *
 * If the key already exists, returns the existing result (dedup).
 * If the key is new, returns null so the caller can process and then
 * call storeIdempotencyResult().
 */
export async function checkIdempotency(
  key: string
): Promise<{ isDuplicate: boolean; existingResult: unknown | null }> {
  if (!key) {
    return { isDuplicate: false, existingResult: null };
  }

  getAdminApp();
  const db = getFirestore();
  const keyRef = db.collection("idempotencyKeys").doc(key);
  const snap = await keyRef.get();

  if (snap.exists) {
    const data = snap.data()!;
    return { isDuplicate: true, existingResult: data.result ?? null };
  }

  return { isDuplicate: false, existingResult: null };
}

/**
 * Stores the result of a successfully processed request against
 * an idempotency key so future duplicate requests return the same result.
 */
export async function storeIdempotencyResult(
  key: string,
  result: unknown
): Promise<void> {
  if (!key) return;

  getAdminApp();
  const db = getFirestore();
  const now = Timestamp.now();
  const ttlMs = IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000;

  await db.collection("idempotencyKeys").doc(key).set({
    key,
    result,
    createdAt: now,
    ttl: Timestamp.fromMillis(now.toMillis() + ttlMs),
  });
}

/**
 * Deletes expired idempotency keys. Called by the daily cleanup cron.
 * Removes keys where ttl is in the past.
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  getAdminApp();
  const db = getFirestore();
  const now = Timestamp.now();

  const expired = await db
    .collection("idempotencyKeys")
    .where("ttl", "<", now)
    .get();

  if (expired.empty) return 0;

  const batch = db.batch();
  expired.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return expired.size;
}
