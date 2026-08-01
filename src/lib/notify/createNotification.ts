// ============================================================
// CREATE NOTIFICATION — Gangaram Notifications
// Module 18 — Fire-and-forget in-app notification creation
// Writes directly to /notifications/{userId}/items/{autoId}
// Admin SDK only — never throws
// ============================================================

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

import { getFailureScope, getResponsibleRoleForFailure } from "@/lib/business-layer/failure-mapping";

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  metadata?: Record<string, unknown>;
}

export interface CreateIncidentParams {
  failureId: string;
  merchantId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

const NOTIFICATION_LIMIT = 200;
const NOTIFICATION_TTL_DAYS = 90;

/**
 * Creates an in-app notification for a user.
 * Fire-and-forget — never throws, logs errors to console.
 * Uses Admin SDK to bypass Firestore rules.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    getAdminApp();
    const db = getFirestore();
    const now = Timestamp.now();

    await db
      .collection("notifications")
      .doc(params.userId)
      .collection("items")
      .add({
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
        read: false,
        metadata: params.metadata ?? null,
        createdAt: now,
        ttl: new Timestamp(now.seconds + NOTIFICATION_TTL_DAYS * 86400, now.nanoseconds),
      });

    // Enforce limit: delete oldest if over threshold
    const countSnap = await db
      .collection("notifications")
      .doc(params.userId)
      .collection("items")
      .count()
      .get();

    if (countSnap.data().count > NOTIFICATION_LIMIT) {
      const overflow = countSnap.data().count - NOTIFICATION_LIMIT;
      const oldestQuery = await db
        .collection("notifications")
        .doc(params.userId)
        .collection("items")
        .orderBy("createdAt", "asc")
        .limit(overflow)
        .get();

      const batch = db.batch();
      oldestQuery.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (err) {
    console.error(JSON.stringify({
      level: "error",
      message: `Failed to create notification of type ${params.type}`,
      userId: params.userId,
      error: err instanceof Error ? err.message : String(err)
    }));
  }
}

/**
 * Creates an operational incident record in /incidents collection.
 * Uses failure-mapping.ts to resolve scope & responsible role automatically.
 */
export async function createOperationalIncident(params: CreateIncidentParams): Promise<string | null> {
  try {
    getAdminApp();
    const db = getFirestore();
    const now = Timestamp.now();

    const failureScope = getFailureScope(params.failureId) || "PLATFORM";
    const responsibleRole = getResponsibleRoleForFailure(params.failureId) || "PLATFORM_OWNER";

    const incidentRef = await db.collection("incidents").add({
      failureId: params.failureId,
      scope: failureScope,
      responsibleRole,
      merchantId: params.merchantId ?? null,
      description: params.description,
      status: "open", // open -> acknowledged -> resolved
      metadata: params.metadata ?? null,
      createdAt: now,
      updatedAt: now,
      acknowledgedAt: null,
      resolvedAt: null,
    });

    return incidentRef.id;
  } catch (err) {
    console.error("Failed to create operational incident:", err);
    return null;
  }
}
