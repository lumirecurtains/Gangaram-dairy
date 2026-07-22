// ============================================================
// Restore Test User Claims — Gangaram
// Module 8 — Emergency Fix
//
// Usage:
//   npx tsx scripts/restore-test-user.ts --uid=<firebase-uid>
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const uidArg = process.argv.find((arg) => arg.startsWith("--uid="));
if (!uidArg) {
  console.error("❌ Usage: npx tsx scripts/restore-test-user.ts --uid=<firebase-uid>");
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

async function restore() {
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

  console.log(`🚑 Restoring test user claims for UID: ${uid}`);

  const userRecord = await auth.getUser(uid);
  const currentClaims = userRecord.customClaims || {};

  // Preserve any existing admin roles, but explicitly enforce our desired state
  const newClaims: Record<string, any> = {
    ...currentClaims,
    merchant_staff: true,
    rider: true,
    merchantId: "demo-merchant-1"
  };
  
  // Cleanup old legacy 'role' string if it exists to strictly use booleans
  delete newClaims.role;

  await auth.setCustomUserClaims(uid, newClaims);
  console.log("✅ Custom claims restored safely:");
  console.log(newClaims);

  await db.collection("roleAssignments").doc(uid).set({
    merchant_staff: true,
    rider: true,
    merchantId: "demo-merchant-1",
    restoredAt: Timestamp.now(),
  }, { merge: true });

  console.log("✅ /roleAssignments document updated.");
  console.log("\n🎉 Done! The user must sign out and sign back in to refresh their token.");
  process.exit(0);
}

restore().catch((err) => {
  console.error("❌ Restore failed:", err);
  process.exit(1);
});
