// ============================================================
// Seed Demo Data — Gangaram
// Module 1 — Creates demo merchant + storefront + menu items
//
// Usage:
//   npx tsx scripts/seed-demo.ts
//
// Requires admin credentials in .env.local
// ============================================================

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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

async function seed() {
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
  const now = Timestamp.now();
  const merchantId = "demo-merchant-1";

  console.log("🌱 Seeding demo data...");

  // Merchant doc
  await db.collection("merchants").doc(merchantId).set({
    razorpayAccountId: null,
    onboardingStatus: "LIVE",
    minimumProfitFloor: 20,
    seoIndexable: true,
    metaTitleOverride: null,
    metaDescriptionOverride: null,
  });

  // Storefront (public)
  await db.collection("storefronts").doc(merchantId).set({
    merchantId,
    name: "Gangaram Restaurant",
    slug: "gangaram-restaurant",
    city: "Patna",
    isOnline: true,
    brandColor: "#FF5722",
    ogImageUrl: null,
    onboardingStatus: "LIVE",
    cuisine: "North Indian, Mughlai",
    openingHours: "10:00 AM - 10:00 PM",
    priceForTwo: 500,
    promoBanner: null,
    updatedAt: now,
  });

  // Menu items
  const menuItems = [
    { name: "Butter Chicken", description: "Creamy tomato-based curry", ourPrice: 320, baseCost: 200, hotelProfit: 120, aggregatorPrice: 380, category: "Main Course", imageUrl: "", veg: false, sortOrder: 1 },
    { name: "Dal Makhani", description: "Rich black lentil curry", ourPrice: 220, baseCost: 130, hotelProfit: 90, aggregatorPrice: 270, category: "Main Course", imageUrl: "", veg: true, sortOrder: 2 },
    { name: "Paneer Tikka", description: "Grilled cottage cheese appetizer", ourPrice: 280, baseCost: 170, hotelProfit: 110, aggregatorPrice: 340, category: "Starters", imageUrl: "", veg: true, sortOrder: 3 },
    { name: "Chicken Biryani", description: "Fragrant layered rice dish", ourPrice: 290, baseCost: 180, hotelProfit: 110, aggregatorPrice: 350, category: "Biryani", imageUrl: "", veg: false, sortOrder: 4 },
    { name: "Veg Biryani", description: "Seasonal vegetables with basmati", ourPrice: 230, baseCost: 140, hotelProfit: 90, aggregatorPrice: 280, category: "Biryani", imageUrl: "", veg: true, sortOrder: 5 },
    { name: "Naan", description: "Tandoor-baked bread", ourPrice: 40, baseCost: 20, hotelProfit: 20, aggregatorPrice: 55, category: "Breads", imageUrl: "", veg: true, sortOrder: 6 },
    { name: "Gulab Jamun", description: "Milk dumplings in rose syrup", ourPrice: 90, baseCost: 50, hotelProfit: 40, aggregatorPrice: 120, category: "Desserts", imageUrl: "", veg: true, sortOrder: 7 },
  ];

  const menuCol = db.collection(`merchants/${merchantId}/menus`);
  for (const item of menuItems) {
    await menuCol.add({ ...item, isAvailable: true });
  }

  console.log(`✅ Demo data created!`);
  console.log(`   Merchant ID: ${merchantId}`);
  console.log(`   Storefront slug: gangaram-restaurant`);
  console.log(`   Menu items: ${menuItems.length}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
