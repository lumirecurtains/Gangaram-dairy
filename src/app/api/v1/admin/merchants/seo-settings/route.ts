// ============================================================
// POST /api/v1/admin/merchants/seo-settings — SEO config
// Module 11 — SEO & Discovery
// Super_admin can update seoIndexable, metaTitleOverride,
// metaDescriptionOverride, and ogImageUrl on merchant/storefront
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { writeAuditLog } from "@/lib/admin/auditLogger";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const {
      merchantId,
      seoIndexable,
      metaTitleOverride,
      metaDescriptionOverride,
      ogImageUrl,
    } = await request.json();

    if (!merchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    getAdminApp();
    const db = getFirestore();
    const merchantRef = db.collection("merchants").doc(merchantId);
    const merchantSnap = await merchantRef.get();

    if (!merchantSnap.exists) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const beforeState = {
      seoIndexable: merchantSnap.data()?.seoIndexable,
      metaTitleOverride: merchantSnap.data()?.metaTitleOverride,
      metaDescriptionOverride: merchantSnap.data()?.metaDescriptionOverride,
    };

    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };

    if (seoIndexable !== undefined) updateData.seoIndexable = seoIndexable;
    if (metaTitleOverride !== undefined) updateData.metaTitleOverride = metaTitleOverride || null;
    if (metaDescriptionOverride !== undefined) updateData.metaDescriptionOverride = metaDescriptionOverride || null;

    await merchantRef.update(updateData);

    // Update ogImageUrl on the storefront doc if provided
    if (ogImageUrl !== undefined) {
      await db.collection("storefronts").doc(merchantId).update({
        ogImageUrl: ogImageUrl || null,
        updatedAt: Timestamp.now(),
      });
    }

    await writeAuditLog({
      actorUid: admin.uid,
      action: "merchant.seo-settings",
      targetPath: `merchants/${merchantId}`,
      beforeState,
      afterState: updateData,
    });

    // Invalidate sitemap cache
    await db.collection("systemMeta").doc("sitemapCache").delete();

    return NextResponse.json({
      success: true,
      merchantId,
      updated: updateData,
      ogImageUrl: ogImageUrl || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("SEO settings error:", err);
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
