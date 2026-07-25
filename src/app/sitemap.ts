import { MetadataRoute } from 'next'
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/onboarding`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  ];

  try {
    getAdminApp();
    const db = getFirestore();

    const storefrontsSnap = await db
      .collection("storefronts")
      .where("onboardingStatus", "==", "LIVE")
      .get();

    // Batch-read merchant docs to check seoIndexable flag
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

    for (const doc of storefrontsSnap.docs) {
      const data = doc.data();
      if (!data.slug) continue;

      const isIndexable = merchantIndexableMap.get(doc.id) ?? true;
      if (!isIndexable) {
        continue;
      }

      routes.push({
        url: `${siteUrl}/h/${data.slug}`,
        lastModified: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  } catch (err: unknown) {
    console.error("Sitemap generation error:", err);
  }

  return routes;
}
