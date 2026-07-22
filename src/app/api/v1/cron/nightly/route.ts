// ============================================================
// POST /api/v1/cron/nightly — Nightly Cron Job
// Module 6 + Module 11 — Metrics rollup + Sitemap generation
// CRON_SECRET must match vercel.json config
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { buildSitemapEntry } from "@/lib/seo/ogTagBuilder";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (token !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    getAdminApp();
    const db = getFirestore();
    const today = new Date().toISOString().split("T")[0];
    const now = Timestamp.now();

    // ---- 1. Aggregate platform metrics for today ----
    const ordersSnap = await db
      .collection("orders")
      .where("status", "in", ["delivered", "paid", "preparing", "ready", "out_for_delivery"])
      .get();

    const todayOrders = ordersSnap.docs.filter((doc) => {
      const createdAt = doc.data()?.createdAt?.toMillis?.();
      if (!createdAt) return false;
      const orderDate = new Date(createdAt).toISOString().split("T")[0];
      return orderDate === today;
    });

    let totalOrders = 0;
    let totalGMV = 0;

    for (const doc of todayOrders) {
      const data = doc.data();
      totalOrders++;
      if (data.grandTotal) {
        totalGMV += data.grandTotal;
      }
    }

    // ---- 2. Count active merchants and riders ----
    const merchantsSnap = await db
      .collection("storefronts")
      .where("onboardingStatus", "==", "LIVE")
      .get();
    const activeMerchants = merchantsSnap.size;

    const roleAssignmentsSnap = await db
      .collection("roleAssignments")
      .where("role", "==", "rider")
      .get();
    const activeRiders = roleAssignmentsSnap.size;

    // ---- 3. Write platform metrics ----
    await db.collection("platformMetrics").doc(today).set(
      {
        totalOrders,
        totalGMV: Math.round(totalGMV * 100) / 100,
        activeMerchants,
        activeRiders,
        updatedAt: now,
      },
      { merge: true }
    );

    // ---- 4. Generate sitemap.xml and cache in Firestore (Module 11) ----
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gangaram.app";
    const urls: string[] = [];
    const currentDate = new Date();

    urls.push(buildSitemapEntry("/", currentDate, 1.0));
    urls.push(buildSitemapEntry("/login", currentDate, 0.3));

    // Batch-read merchant docs for seoIndexable check
    const merchantRefs = merchantsSnap.docs.map((doc) =>
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

    for (const doc of merchantsSnap.docs) {
      const data = doc.data();
      const slug = data.slug;
      if (!slug) continue;
      if (!(merchantIndexableMap.get(doc.id) ?? true)) continue;

      const updatedAt = data.updatedAt?.toMillis
        ? new Date(data.updatedAt.toMillis())
        : currentDate;

      urls.push(buildSitemapEntry(`/h/${slug}`, updatedAt, 0.8));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    await db.collection("systemMeta").doc("sitemapCache").set({
      xml,
      urlCount: urls.length,
      cachedAt: Timestamp.now(),
    });

    // ---- 5. Backup placeholder ----
    // In production, this would trigger a Firestore export via GCS

    return NextResponse.json({
      status: "ok",
      date: today,
      metrics: {
        totalOrders,
        totalGMV: Math.round(totalGMV * 100) / 100,
        activeMerchants,
        activeRiders,
      },
      sitemap: {
        generated: true,
        urlCount: urls.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Nightly cron error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
