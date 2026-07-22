// ============================================================
// Setup Rider Claims — Gangaram
// Module 5 (Temporary Script until Module 8 UI is built)
//
// Usage:
//   npx tsx scripts/set-rider-claims.ts --uid=<firebase-uid>
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const uidArg = process.argv.find((arg) => arg.startsWith("--uid="));
if (!uidArg) {
  console.error("❌ Usage: npx tsx scripts/set-rider-claims.ts --uid=<firebase-uid>");
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

  console.log(`🛵 Bootstrapping Rider Staff for UID: ${uid}`);

  await auth.setCustomUserClaims(uid, { rider: true });
  console.log("✅ Custom claims set: { rider: true }");

  await db.collection("roleAssignments").doc(uid).set({
    role: "rider",
    grantedBy: "set-rider-claims-script",
    grantedAt: Timestamp.now(),
  }, { merge: true });

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      theme: "light",
      language: "en",
      name: "Rider",
      address: "",
      phone: "",
      isBanned: false,
    });
  }

  console.log("\n🎉 Done! The user can now access the Driver Dashboard.");
  console.log("   IMPORTANT: The user MUST sign out and sign back in to refresh their token.");
  process.exit(0);
}

setClaims().catch((err) => {
  console.error("❌ Claims setup failed:", err);
  process.exit(1);
});
