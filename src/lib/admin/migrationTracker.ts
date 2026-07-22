// ============================================================
// MIGRATION TRACKER — Gangaram Admin
// Module 6 — Records schema migrations
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface MigrationRecord {
  version: string;
  description: string;
  appliedBy: string;
  appliedAt: FirebaseFirestore.Timestamp;
}

export async function logMigration(
  version: string,
  description: string,
  appliedBy: string
): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  await db.collection("migrations").add({
    version,
    description,
    appliedBy,
    appliedAt: Timestamp.now(),
  });
}

export async function getCurrentSchemaVersion(): Promise<string | null> {
  getAdminApp();
  const db = getFirestore();
  const doc = await db.collection("systemMeta").doc("schemaVersion").get();
  if (!doc.exists) return null;
  return doc.data()?.currentVersion ?? null;
}
