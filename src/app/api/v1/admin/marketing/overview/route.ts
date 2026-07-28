// ============================================================
// GET /api/v1/admin/marketing/overview
// Module 6 — Super Admin Marketing Hub Foundation
// Aggregates marketing metrics across all live merchants
// securely scoped behind requireSuperAdmin
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { resolveCampaignStatus } from "@/lib/marketing/campaignResolver";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    getAdminApp();
    const db = getFirestore();

    // 1. Fetch all storefronts to get the base directory of branches
    // We only care about LIVE or actively configuring branches.
    const storefrontsSnap = await db.collection("storefronts").get();

    // 2. Fetch Global Counters 
    // In a massive production dataset, counting across all subcollections dynamically per request
    // could breach memory limits. We use native `.count()` aggregations to remain performant.
    
    const overviewPromises = storefrontsSnap.docs.map(async (doc) => {
      const data = doc.data();
      const merchantId = doc.id;

      // Aggregations per tenant
      const [bannersSnap, campaignsSnap, featuredSnap] = await Promise.all([
        db.collection(`merchants/${merchantId}/banners`).where("isActive", "==", true).get(),
        db.collection(`merchants/${merchantId}/campaigns`).where("isActive", "==", true).get(),
        db.collection(`merchants/${merchantId}/featuredSections`).where("isActive", "==", true).count().get()
      ]);

      // Filter active banners by date
      const now = Date.now();
      const activeBanners = bannersSnap.docs.filter(bDoc => {
        const b = bDoc.data();
        const startMs = b.startDate?._seconds ? b.startDate._seconds * 1000 : 0;
        const endMs = b.endDate?._seconds ? b.endDate._seconds * 1000 : Infinity;
        return now >= startMs && now <= endMs;
      }).length;

      // Filter active campaigns by custom resolver logic
      const activeCampaigns = campaignsSnap.docs.filter(cDoc => {
        return resolveCampaignStatus(cDoc.data() as any, now) === "Active";
      }).length;

      return {
        merchantId,
        name: data.name,
        onboardingStatus: data.onboardingStatus,
        activeBanners,
        activeCampaigns,
        activeFeatured: featuredSnap.data().count
      };
    });

    const overview = await Promise.all(overviewPromises);

    // Sort alphabetically by name
    overview.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json({ overview });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
