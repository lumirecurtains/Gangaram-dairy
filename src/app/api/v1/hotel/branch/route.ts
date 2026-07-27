// ============================================================
// GET & POST /api/v1/hotel/branch
// Module 1/2 — Branch Management Foundation
// Hotel Admin updates branch profile details and storefront UI.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/api/verifyAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    // Authorization: Must be Super Admin or Hotel Admin
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    if (!user.merchantId && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: No branch assigned" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetMerchantId = searchParams.get("merchantId") || user.merchantId;

    if (!targetMerchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    // Cross-branch isolation check
    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch access denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();

    const [merchantDoc, storefrontDoc] = await Promise.all([
      db.collection("merchants").doc(targetMerchantId).get(),
      db.collection("storefronts").doc(targetMerchantId).get()
    ]);

    if (!merchantDoc.exists) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const merchantData = merchantDoc.data() || {};
    const storefrontData = storefrontDoc.exists ? storefrontDoc.data() : {};

    // Merge for the client
    const branchProfile = {
      merchantId: targetMerchantId,
      name: storefrontData?.name || "",
      slug: storefrontData?.slug || "",
      city: storefrontData?.city || "",
      cuisine: storefrontData?.cuisine || "",
      openingHours: storefrontData?.openingHours || "",
      contactEmail: merchantData?.contactEmail || "",
      contactPhone: merchantData?.contactPhone || "",
      isOnline: storefrontData?.isOnline || false,
      brandColor: storefrontData?.brandColor || "",
      ogImageUrl: storefrontData?.ogImageUrl || "",
      promoBanner: storefrontData?.promoBanner || "",
      onboardingStatus: merchantData?.onboardingStatus || "UNKNOWN",
    };

    return NextResponse.json(branchProfile);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    // Authorization: Must be Super Admin or Hotel Admin
    if (!user.isSuperAdmin && !user.isHotelAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const targetMerchantId = body.merchantId || user.merchantId;

    if (!targetMerchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    // Cross-branch isolation check
    if (!user.isSuperAdmin && user.merchantId !== targetMerchantId) {
      return NextResponse.json({ error: "Forbidden: Cross-branch modification denied" }, { status: 403 });
    }

    getAdminApp();
    const db = getFirestore();

    const merchantRef = db.collection("merchants").doc(targetMerchantId);
    const storefrontRef = db.collection("storefronts").doc(targetMerchantId);

    const merchantDoc = await merchantRef.get();
    if (!merchantDoc.exists) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const merchantUpdates: any = { updatedAt: Timestamp.now() };
    const storefrontUpdates: any = { updatedAt: Timestamp.now() };

    // Common fields
    if (body.name !== undefined) storefrontUpdates.name = body.name.trim();
    if (body.city !== undefined) storefrontUpdates.city = body.city.trim();
    if (body.cuisine !== undefined) storefrontUpdates.cuisine = body.cuisine.trim() || null;
    if (body.openingHours !== undefined) storefrontUpdates.openingHours = body.openingHours.trim() || null;
    
    // Merchant Private Details
    if (body.contactEmail !== undefined) merchantUpdates.contactEmail = body.contactEmail.trim() || null;
    if (body.contactPhone !== undefined) merchantUpdates.contactPhone = body.contactPhone.trim() || null;

    // Visuals & SEO
    if (body.brandColor !== undefined) storefrontUpdates.brandColor = body.brandColor.trim() || null;
    if (body.promoBanner !== undefined) storefrontUpdates.promoBanner = body.promoBanner.trim() || null;
    if (body.ogImageUrl !== undefined) storefrontUpdates.ogImageUrl = body.ogImageUrl.trim() || null;
    
    // Status Toggle
    if (body.isOnline !== undefined) {
      if (typeof body.isOnline !== "boolean") {
        return NextResponse.json({ error: "isOnline must be a boolean" }, { status: 400 });
      }
      storefrontUpdates.isOnline = body.isOnline;
    }

    const batch = db.batch();
    
    if (Object.keys(merchantUpdates).length > 1) {
      batch.update(merchantRef, merchantUpdates);
    }
    if (Object.keys(storefrontUpdates).length > 1) {
      batch.update(storefrontRef, storefrontUpdates);
    }
    
    await batch.commit();

    return NextResponse.json({ success: true, message: "Branch updated successfully" });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Branch Update API error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") || message.includes("Authorization") ? 403 : 500 }
    );
  }
}
