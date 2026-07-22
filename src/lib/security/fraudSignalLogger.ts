// ============================================================
// FRAUD SIGNAL LOGGER — Gangaram Security Layer
// Module 9 — Captures abnormal request payloads securely
// into /fraudSignals for admin review
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface FraudSignal {
  uid: string | null;
  signal: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: FirebaseFirestore.Timestamp;
}

/**
 * Logs a fraud signal to the /fraudSignals collection.
 * Never throws — logs errors and fails silently.
 *
 * @param uid - The suspected user's UID, or null if unknown
 * @param signal - Short identifier for the type of fraud (e.g. "excessive_otp", "price_manipulation")
 * @param details - Arbitrary key-value details about the incident
 * @param request - Optional Next.js request object to extract IP and UA
 */
export async function logFraudSignal(
  uid: string | null,
  signal: string,
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    getAdminApp();
    const db = getFirestore();

    await db.collection("fraudSignals").add({
      uid,
      signal,
      details,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      timestamp: Timestamp.now(),
    });
  } catch (err) {
    console.error("Failed to log fraud signal:", err);
  }
}

/**
 * Convenience wrapper for logging a fraud signal from an API route.
 * Extracts IP and User-Agent from the request headers automatically.
 */
export async function logFraudSignalFromRequest(
  request: { headers: { get: (name: string) => string | null } },
  uid: string | null,
  signal: string,
  details: Record<string, unknown>
): Promise<void> {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  await logFraudSignal(uid, signal, details, ipAddress, userAgent);
}
