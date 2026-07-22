// ============================================================
// Promote Super Admin — Gangaram
// Safe One-Time Bootstrap Script
//
// Usage:
//   npx tsx scripts/promote-super-admin.ts --uid=<firebase-uid>
//
// Merges { super_admin: true } into existing claims without
// overwriting legitimate existing roles (merchant_staff, rider, etc).
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const uidArg = process.argv.find((arg) => arg.startsWith("--uid="));
if (!uidArg) {
  console.error("❌ Usage: npx tsx scripts/promote-super-admin.ts --uid=<firebase-uid>");
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

async function promote() {
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

  console.log(`👑 Promoting UID to Super Admin: ${uid}`);

  const userRecord = await auth.getUser(uid);
  const currentClaims = userRecord.customClaims || {};

  const newClaims: Record<string, any> = {
    ...currentClaims,
    super_admin: true
  };

  // Remove the old legacy 'role' string if it exists to strictly adhere to boolean module 8 logic
  delete newClaims.role;

  await auth.setCustomUserClaims(uid, newClaims);
  console.log("✅ Custom claims safely merged:");
  console.log(newClaims);

  await db.collection("roleAssignments").doc(uid).set({
    super_admin: true,
    grantedBy: "safe-bootstrap-script",
    grantedAt: Timestamp.now(),
  }, { merge: true });

  console.log("✅ /roleAssignments document updated.");
  console.log("\n🎉 Done! The user must sign out and sign back in to refresh their token.");
  process.exit(0);
}

promote().catch((err) => {
  console.error("❌ Promotion failed:", err);
  process.exit(1);
});
