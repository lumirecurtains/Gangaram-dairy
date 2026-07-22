// ============================================================
// Firebase Admin SDK — Gangaram
// Module 1 — Server-side Firebase admin initialization
// Lazy init — only connects when env vars are available
// ============================================================

import { initializeApp, getApps, cert, type AppOptions } from "firebase-admin/app";
import type { App } from "firebase-admin/app";

function normalizeEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function createAdminConfig(): AppOptions | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizeEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  };
}

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const config = createAdminConfig();
  if (!config) {
    throw new Error(
      "Firebase Admin SDK not configured. Set FIREBASE_ADMIN_PROJECT_ID, " +
      "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY env vars."
    );
  }

  adminApp = initializeApp(config);
  return adminApp;
}
