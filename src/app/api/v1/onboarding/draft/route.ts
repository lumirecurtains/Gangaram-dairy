// ============================================================
// POST /api/v1/onboarding/draft — Create merchant draft
// Module 7 — Merchant Onboarding
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";
import { checkRateLimit } from "@/lib/security/rateLimiter";
import { claimIdempotencyKey, storeIdempotencyResult } from "@/lib/security/idempotencyGuard";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
        const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const idemResult = await claimIdempotencyKey(idempotencyKey, user.uid);
    if (idemResult.isDuplicate) {
      if (idemResult.isProcessing) {
        return NextResponse.json({ error: "Request already processing" }, { status: 429 });
      }
      return NextResponse.json(idemResult.existingResult);
    }

    const rl = await checkRateLimit(user.uid, "onboarding:draft");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // A user can only have one draft/live merchant. If they are already staff, reject.
    if (user.isMerchantStaff || user.merchantId) {
       return NextResponse.json({ error: "You are already associated with a merchant account" }, { status: 403 });
    }

    const { name, slug, city, brandColor, cuisine, openingHours, priceForTwo } = await request.json();

    if (!name || !slug || !city) {
      return NextResponse.json(
        { error: "name, slug, and city are required" },
        { status: 400 }
      );
    }

    getAdminApp();
    const db = getFirestore();

    // Check slug uniqueness
    const existingStorefront = await db
      .collection("storefronts")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!existingStorefront.empty) {
      return NextResponse.json(
        { error: "A storefront with this slug already exists" },
        { status: 409 }
      );
    }

    const now = Timestamp.now();
    const merchantId = `merchant_${Date.now()}`;

    // Create merchant doc
    await db.collection("merchants").doc(merchantId).set({
      ownerUid: user.uid,
      razorpayAccountId: null,
      onboardingStatus: "DRAFT",
      subscriptionPlan: "BASIC",
      subscriptionStatus: "ACTIVE",
      isFrozen: false,
      rejectionReason: null,
      deletedAt: null,
      minimumProfitFloor: 20,
      seoIndexable: true,
      metaTitleOverride: null,
      metaDescriptionOverride: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create public storefront doc
    await db.collection("storefronts").doc(merchantId).set({
      merchantId,
      ownerUid: user.uid,
      name,
      slug,
      city,
      isOnline: false,
      brandColor: brandColor || null,
      ogImageUrl: null,
      onboardingStatus: "DRAFT",
      cuisine: cuisine || null,
      openingHours: openingHours || null,
      priceForTwo: priceForTwo || null,
      promoBanner: null,
      updatedAt: now,
    });

    // Seed defaults — loyalty account
    await db.collection("loyaltyAccounts").doc(merchantId).set({
      pointsBalance: 0,
      lifetimePoints: 0,
      updatedAt: now,
    });

    await writeAuditLog({
      actorUid: user.uid,
      action: "onboarding.draft",
      targetPath: `merchants/${merchantId}`,
      beforeState: null,
      afterState: { merchantId, name, slug, city, status: "DRAFT" },
    });

        const finalResponse = {
      success: true,
      merchantId,
      name,
      slug,
      city,
      onboardingStatus: "DRAFT",
    };

    await storeIdempotencyResult(idempotencyKey, user.uid, finalResponse);
    return NextResponse.json(finalResponse);
  } catch (err: any) {
    console.error("Onboarding draft error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("Authorization") ? 401 : 500 }
    );
  }
}
