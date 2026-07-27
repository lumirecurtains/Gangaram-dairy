// ============================================================
// Update Menu Images — Gangaram
// Module 11 — Safely updates image URLs for menu items and storefronts
//
// Usage:
//   npx tsx scripts/update-menu-images.ts
//
// Requires admin credentials in .env.local
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

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

// Load env
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = normalizeEnvValue(trimmed.slice(eqIndex + 1));
        process.env[key] = value;
      }
    }
  }
}

async function updateImages() {
  if (!getApps().length) {
    const privateKey = normalizeEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n");

    initializeApp({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  }

  const db = getFirestore();

  // 1. Setup Merchant ID and Updates Map
  const merchantId = "demo-merchant-1";

  const imageUpdates: Record<string, string> = {
    "butter-chicken": "https://example.com/images/butter-chicken.jpg",
    "dal-makhani": "https://example.com/images/dal-makhani.jpg",
    "paneer-tikka": "https://example.com/images/paneer-tikka.jpg",
    "chicken-biryani": "https://example.com/images/chicken-biryani.jpg",
    "veg-biryani": "https://example.com/images/veg-biryani.jpg",
    "naan": "https://example.com/images/naan.jpg",
    "gulab-jamun": "https://example.com/images/gulab-jamun.jpg",
  };

  const storefrontUpdates = {
    imageUrl: "https://example.com/images/store-image.jpg",
    ogImageUrl: "https://example.com/images/og-image.jpg",
    promoBanner: "https://example.com/images/promo-banner.jpg",
  };

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let total = Object.keys(imageUpdates).length + 1; // +1 for storefront

  console.log(`Starting image updates for merchant: ${merchantId}\n`);

  // 2. Update Storefront Images
  try {
    const storefrontRef = db.collection("storefronts").doc(merchantId);
    const storefrontDoc = await storefrontRef.get();

    if (!storefrontDoc.exists) {
      console.warn(`⚠ skipped: Storefront '${merchantId}' does not exist.`);
      skipped++;
    } else {
      await storefrontRef.set(storefrontUpdates, { merge: true });
      console.log(`✔ success: Updated storefront images for '${merchantId}'.`);
      updated++;
    }
  } catch (err) {
    console.error(`❌ failed: Error updating storefront '${merchantId}':`, err);
    failed++;
  }

  // 3. Update Menu Item Images
  const menuCol = db.collection(`merchants/${merchantId}/menus`);

  for (const [itemId, url] of Object.entries(imageUpdates)) {
    try {
      const itemRef = menuCol.doc(itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        console.warn(`⚠ skipped: Menu item '${itemId}' does not exist.`);
        skipped++;
      } else {
        await itemRef.set({ imageUrl: url }, { merge: true });
        console.log(`✔ success: Updated image for menu item '${itemId}'.`);
        updated++;
      }
    } catch (err) {
      console.error(`❌ failed: Error updating menu item '${itemId}':`, err);
      failed++;
    }
  }

  // 4. Print Summary
  console.log("\n--- Update Summary ---");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Total:   ${total}`);
  
  process.exit(0);
}

updateImages().catch((err) => {
  console.error("❌ Script failed unexpectedly:", err);
  process.exit(1);
});
