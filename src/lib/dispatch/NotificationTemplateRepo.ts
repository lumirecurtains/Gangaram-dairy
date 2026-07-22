// ============================================================
// NOTIFICATION TEMPLATE REPO — Gangaram Notifications
// Module 12 — Reads templates from /notificationTemplates
// Supports {{variable}} substitution — NO eval, NO dynamic code
// ============================================================

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface NotificationTemplate {
  channel: "whatsapp" | "sms" | "push" | "in_app";
  subjectOrTitle: string;
  bodyTemplate: string;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Loads a notification template from Firestore by its key.
 * Returns null if the template doesn't exist.
 */
export async function getTemplate(
  templateKey: string
): Promise<NotificationTemplate | null> {
  getAdminApp();
  const db = getFirestore();
  const snapshot = await db
    .collection("notificationTemplates")
    .doc(templateKey)
    .get();

  if (!snapshot.exists) return null;
  return snapshot.data() as NotificationTemplate;
}

/**
 * Renders a template string by substituting {{variable}} placeholders.
 *
 * SAFETY: Only does string replacement on exact {{key}} patterns.
 * NO eval, NO Function constructor, NO dynamic code execution.
 *
 * @param template - The template string with {{variable}} placeholders
 * @param variables - Key-value pairs for substitution
 * @returns The rendered string
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}
