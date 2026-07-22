// ============================================================
// Migration Script — Gangaram
// Module 8 — Convert old string roles/claims to boolean flags
//
// Usage:
//   npx tsx scripts/migrate-to-boolean-claims.ts --uid=<firebase-uid>
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const uidArg = process.argv.find((arg) => arg.startsWith("--uid="));
if (!uidArg) {
  console.error("❌ Usage: npx tsx scripts/migrate-to-boolean-claims.ts --uid=<firebase-uid>");
  process.exit(1);
}
const uid = uidArg.split("=")[1];

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

async function migrate() {
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  }

  const auth = getAuth();
  const db = getFirestore();

  console.log(`🔄 Migrating claims for UID: ${uid}`);

  const userRecord = await auth.getUser(uid);
  const currentClaims = userRecord.customClaims || {};

  const isSuperAdmin = currentClaims.role === "super_admin" || currentClaims.super_admin === true;
  const isMerchantStaff = currentClaims.role === "merchant_staff" || currentClaims.merchant_staff === true;
  const isRider = currentClaims.role === "rider" || currentClaims.rider === true;
  const isSupportAgent = currentClaims.role === "support_agent" || currentClaims.support_agent === true;

  const merchantId = currentClaims.merchantId || null;

  const newClaims: Record<string, any> = {
    super_admin: isSuperAdmin,
    merchant_staff: isMerchantStaff,
    rider: isRider,
    support_agent: isSupportAgent
  };
  if (merchantId) {
    newClaims.merchantId = merchantId;
  }

  await auth.setCustomUserClaims(uid, newClaims);
  console.log("✅ Custom claims migrated successfully:");
  console.log(newClaims);

  await db.collection("roleAssignments").doc(uid).set({
    super_admin: isSuperAdmin,
    merchant_staff: isMerchantStaff,
    rider: isRider,
    support_agent: isSupportAgent,
    merchantId: merchantId,
    migratedAt: Timestamp.now(),
  }, { merge: true });

  console.log("✅ /roleAssignments document updated.");
  console.log("\n🎉 Done! The user must sign out and sign back in to refresh their token.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
