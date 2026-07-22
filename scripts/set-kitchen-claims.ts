// ============================================================
// Setup Kitchen Staff Claims — Gangaram
// Module 4 (Temporary Script until Module 8 UI is built)
//
// Usage:
//   npx tsx scripts/set-kitchen-claims.ts --uid=<firebase-uid>
//
// This script grants the merchant_staff custom claim and assigns
// the user to the demo merchant.
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const uidArg = process.argv.find((arg) => arg.startsWith("--uid="));
if (!uidArg) {
  console.error("❌ Usage: npx tsx scripts/set-kitchen-claims.ts --uid=<firebase-uid>");
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
        // Remove surrounding quotes if they exist
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

async function setClaims() {
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

  console.log(`🍳 Bootstrapping Kitchen Staff for UID: ${uid}`);

  await auth.setCustomUserClaims(uid, {
    merchant_staff: true,
    merchantId: "demo-merchant-1",
  });
  console.log("✅ Custom claims set: { merchant_staff: true, merchantId: 'demo-merchant-1' }");

  await db.collection("roleAssignments").doc(uid).set({
    role: "merchant_staff",
    merchantId: "demo-merchant-1",
    grantedBy: "set-kitchen-claims-script",
    grantedAt: Timestamp.now(),
  }, { merge: true });
  console.log("✅ Role assignment doc updated in /roleAssignments");

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      theme: "light",
      language: "en",
      name: "Kitchen Staff",
      address: "",
      phone: "",
      isBanned: false,
    });
    console.log("✅ User doc created in /users");
  }

  console.log("\n🎉 Done! The user can now access the Kitchen Dashboard.");
  console.log("   IMPORTANT: The user MUST sign out and sign back in to refresh their token.");
  process.exit(0);
}

setClaims().catch((err) => {
  console.error("❌ Claims setup failed:", err);
  process.exit(1);
});
