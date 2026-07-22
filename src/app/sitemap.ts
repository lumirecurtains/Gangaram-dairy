import { MetadataRoute } from 'next'
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gangaram.app";
  
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

    for (const doc of storefrontsSnap.docs) {
      const data = doc.data();
      if (!data.slug) continue;

      const merchantDoc = await db.collection("merchants").doc(doc.id).get();
      if (merchantDoc.exists && merchantDoc.data()?.seoIndexable === false) {
        continue;
      }

      routes.push({
        url: `${siteUrl}/h/${data.slug}`,
        lastModified: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  } catch (err) {
    console.error("Sitemap generation error:", err);
  }

  return routes;
}
