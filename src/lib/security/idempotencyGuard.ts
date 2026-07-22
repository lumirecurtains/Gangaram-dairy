// ============================================================
// IDEMPOTENCY GUARD — Gangaram Security Layer
// Module 9 — Checks and stores idempotency keys
// Prevents duplicate processing of the same request
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface IdempotencyRecord {
  key: string;
  uid: string;
  result: unknown | null;
  status: "processing" | "completed";
  createdAt: FirebaseFirestore.Timestamp;
  ttl: FirebaseFirestore.Timestamp;
}

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Atomically attempts to claim an idempotency key for a specific user.
 *
 * Returns:
 *  - isDuplicate: true if key exists.
 *  - existingResult: The result payload if it was completed, or null if it's still 'processing'.
 *  - isProcessing: true if another thread is currently working on this key.
 */
export async function claimIdempotencyKey(
  key: string,
  uid: string
): Promise<{ isDuplicate: boolean; existingResult: unknown | null; isProcessing: boolean }> {
  if (!key) {
    return { isDuplicate: false, existingResult: null, isProcessing: false };
  }

  getAdminApp();
  const db = getFirestore();
  const keyRef = db.collection("idempotencyKeys").doc(`${uid}_${key}`);
  const now = Timestamp.now();
  const ttlMs = IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000;

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(keyRef);

      if (snap.exists) {
        const data = snap.data() as IdempotencyRecord;
        return { 
          isDuplicate: true, 
          existingResult: data.status === "completed" ? data.result : null,
          isProcessing: data.status === "processing"
        };
      }

      // Claim the key
      tx.set(keyRef, {
        key,
        uid,
        result: null,
        status: "processing",
        createdAt: now,
        ttl: Timestamp.fromMillis(now.toMillis() + ttlMs),
      });

      return { isDuplicate: false, existingResult: null, isProcessing: false };
    });

    return result;
  } catch (err) {
    console.error("Idempotency claim failed:", err);
    // Fail closed for financial transactions
    return { isDuplicate: true, existingResult: null, isProcessing: true };
  }
}

/**
 * Stores the final result of a successfully processed request.
 */
export async function storeIdempotencyResult(
  key: string,
  uid: string,
  result: unknown
): Promise<void> {
  if (!key) return;

  getAdminApp();
  const db = getFirestore();
  
  await db.collection("idempotencyKeys").doc(`${uid}_${key}`).update({
    result,
    status: "completed",
    updatedAt: Timestamp.now()
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
