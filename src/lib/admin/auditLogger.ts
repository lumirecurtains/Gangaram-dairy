// ============================================================
// AUDIT LOGGER — Gangaram Admin
// Module 6 — Writes structured audit log entries
// ============================================================

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface AuditLogEntry {
  actorUid: string;
  action: string;
  targetPath: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  timestamp: FirebaseFirestore.Timestamp;
}

/**
 * Writes an audit log entry to /auditLogs/{autoId}.
 * Never throws — logs errors to console and fails silently.
 */
export async function writeAuditLog(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
  try {
    getAdminApp();
    const db = getFirestore();
    await db.collection("auditLogs").add({
      ...entry,
      timestamp: Timestamp.now(),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
