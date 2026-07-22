// ============================================================
// GET /api/v1/admin/merchants/sitemap — XML Sitemap Generator
// Module 11 — SEO & Discovery
// Returns XML sitemap of all LIVE, indexable storefronts
// Caches result in Firestore for performance
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/api/verifyAuth";
import { buildSitemapEntry } from "@/lib/seo/ogTagBuilder";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    getAdminApp();
    const db = getFirestore();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gangaram.app";

    // Check for cached sitemap in Firestore (updated by nightly cron)
    const cachedDoc = await db.collection("systemMeta").doc("sitemapCache").get();
    if (cachedDoc.exists) {
      const data = cachedDoc.data()!;
      const cachedAt = data.cachedAt?.toMillis?.() || 0;
      const cacheAge = Date.now() - cachedAt;

      // Use cache if less than 6 hours old
      if (cacheAge < 6 * 60 * 60 * 1000 && data.xml) {
        return new NextResponse(data.xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=21600, s-maxage=21600",
            "X-Cache": "HIT",
          },
        });
      }
    }

    // Fetch all LIVE storefronts
    const storefrontsSnap = await db
      .collection("storefronts")
      .where("onboardingStatus", "==", "LIVE")
      .get();

    // Batch-read merchant docs to check seoIndexable flag
    // Storefront doc IDs are the same as merchant doc IDs
    const merchantRefs = storefrontsSnap.docs.map((doc) =>
      db.collection("merchants").doc(doc.id)
    );

    let merchantDocs: Array<FirebaseFirestore.DocumentSnapshot | null> = [];
    if (merchantRefs.length > 0) {
      merchantDocs = await db.getAll(...merchantRefs);
    }

    const merchantIndexableMap = new Map<string, boolean>();
    merchantDocs.forEach((snap) => {
      if (snap?.exists) {
        const data = snap.data()!;
        merchantIndexableMap.set(snap.id, data.seoIndexable !== false);
      }
    });

    // Build XML sitemap
    const urls: string[] = [];
    const now = new Date();

    // Static pages
    urls.push(buildSitemapEntry("/", now, 1.0));
    urls.push(buildSitemapEntry("/login", now, 0.3));

    // Restaurant pages — only indexable ones
    for (const doc of storefrontsSnap.docs) {
      const data = doc.data();
      const slug = data.slug;
      if (!slug) continue;

      const isIndexable = merchantIndexableMap.get(doc.id) ?? true;
      if (!isIndexable) continue;

      const updatedAt = data.updatedAt?.toMillis
        ? new Date(data.updatedAt.toMillis())
        : now;

      urls.push(buildSitemapEntry(`/h/${slug}`, updatedAt, 0.8));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    // Cache in Firestore
    await db.collection("systemMeta").doc("sitemapCache").set({
      xml,
      urlCount: urls.length,
      cachedAt: Timestamp.now(),
    });

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=21600, s-maxage=21600",
        "X-Cache": "MISS",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
