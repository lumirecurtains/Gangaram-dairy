// ============================================================
// Bootstrap First Super Admin — Gangaram
// Module 8 (but can be used standalone)
//
// Usage:
//   npx tsx scripts/bootstrap-first-admin.ts --uid=<firebase-uid>
//
// This script grants the super_admin claim and writes the
// roleAssignment doc. Run ONCE after your Firebase project is live.
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Parse --uid=xxx from command line
const uidArg = process.argv.find((arg) => arg.startsWith("--uid="));
if (!uidArg) {
  console.error("❌ Usage: npx tsx scripts/bootstrap-first-admin.ts --uid=<firebase-uid>");
  process.exit(1);
}
const uid = uidArg.split("=")[1];

// Load env if .env.local exists
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

async function bootstrap() {
  // Initialize Admin SDK
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

  console.log(`🚀 Bootstrapping super_admin for UID: ${uid}`);

  // 1. Set custom claims
  await auth.setCustomUserClaims(uid, {
    role: "super_admin",
  });
  console.log("✅ Custom claims set: { role: 'super_admin' }");

  // 2. Write role assignment document
  await db.collection("roleAssignments").doc(uid).set({
    role: "super_admin",
    grantedBy: "bootstrap-script",
    grantedAt: Timestamp.now(),
  });
  console.log("✅ Role assignment doc written to /roleAssignments");

  // 3. Create user doc if it doesn't exist
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      theme: "light",
      language: "en",
      name: "Super Admin",
      address: "",
      phone: "",
      isBanned: false,
      bannedReason: null,
      bannedAt: null,
    });
    console.log("✅ User doc created in /users");
  }

  console.log("\n🎉 Done! You are now super_admin.");
  console.log("   Run `npx tsx scripts/refresh-claims.ts` if the app doesn't pick it up.");
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap failed:", err);
  process.exit(1);
});
