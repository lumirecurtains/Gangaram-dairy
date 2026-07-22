// ============================================================
// PREFERENCE GATE — Gangaram Notifications
// Module 12 — Checks user notification preferences before sending
// Muted channel = no-op success (skip silently)
// ============================================================

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface NotificationPreferences {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  marketingOptIn: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  whatsappEnabled: true,
  smsEnabled: true,
  pushEnabled: true,
  marketingOptIn: false,
};

/**
 * Loads a user's notification preferences from /notificationPreferences/{uid}.
 * Returns defaults if the document doesn't exist.
 */
export async function getUserPreferences(
  uid: string
): Promise<NotificationPreferences> {
  getAdminApp();
  const db = getFirestore();
  const snapshot = await db
    .collection("notificationPreferences")
    .doc(uid)
    .get();

  if (!snapshot.exists) return { ...DEFAULT_PREFERENCES };
  const data = snapshot.data() as Partial<NotificationPreferences>;

  return {
    whatsappEnabled: data.whatsappEnabled ?? DEFAULT_PREFERENCES.whatsappEnabled,
    smsEnabled: data.smsEnabled ?? DEFAULT_PREFERENCES.smsEnabled,
    pushEnabled: data.pushEnabled ?? DEFAULT_PREFERENCES.pushEnabled,
    marketingOptIn: data.marketingOptIn ?? DEFAULT_PREFERENCES.marketingOptIn,
  };
}

/**
 * Checks whether a given channel is allowed for a user.
 * Returns true if the channel is enabled, false if muted.
 */
export async function isChannelAllowed(
  uid: string,
  channel: "whatsapp" | "sms" | "push" | "in_app"
): Promise<boolean> {
  const prefs = await getUserPreferences(uid);

  switch (channel) {
    case "whatsapp":
      return prefs.whatsappEnabled;
    case "sms":
      return prefs.smsEnabled;
    case "push":
      return prefs.pushEnabled;
    case "in_app":
      return true; // In-app is always allowed
    default:
      return false;
  }
}
