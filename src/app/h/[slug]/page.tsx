// ============================================================
// /h/[slug] — Restaurant Detail Page (Server Component)
// Module 11 — generateMetadata for dynamic OG tags + SEO
// ============================================================

import type { Metadata } from "next";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import RestaurantPageClient from "./RestaurantPageClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface StorefrontDoc {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  city: string;
  isOnline?: boolean;
  cuisine?: string | null;
  openingHours?: string | null;
  priceForTwo?: number | null;
  promoBanner?: string | null;
  brandColor?: string | null;
  ogImageUrl?: string | null;
  onboardingStatus: string;
  seoIndexable?: boolean;
  metaTitleOverride?: string | null;
  metaDescriptionOverride?: string | null;
  updatedAt: { toMillis: () => number } | { seconds: number };
}

/**
 * Generates dynamic metadata for the restaurant detail page,
 * including OpenGraph tags, canonical URL, and structured schema.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gangaram.app";

  try {
    getAdminApp();
    const db = getFirestore();

    const snapshot = await db
      .collection("storefronts")
      .where("slug", "==", slug)
      .where("onboardingStatus", "==", "LIVE")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        title: "Restaurant Not Found - Gangaram",
        robots: { index: false },
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as StorefrontDoc;

    const title = data.metaTitleOverride
      ? data.metaTitleOverride
      : `${data.name} - Order Direct, Save on Fees`;

    const description = data.metaDescriptionOverride
      ? data.metaDescriptionOverride
      : `Order from ${data.name} in ${data.city}. ${data.cuisine ? data.cuisine + "." : ""} Better prices, no aggregator markups.`;

    const canonicalUrl = `${siteUrl}/h/${slug}`;
    const ogImage = data.ogImageUrl || data.promoBanner || null;

    return {
      title,
      description,
      robots: data.seoIndexable !== false ? { index: true, follow: true } : { index: false },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: "Gangaram",
        images: ogImage
          ? [
              {
                url: ogImage,
                width: 1200,
                height: 630,
                alt: data.name,
              },
            ]
          : [],
        type: "website",
        locale: "en_IN",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : [],
      },
      alternates: {
        canonical: canonicalUrl,
      },
      other: {
        "application-ld+json": JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: data.name,
          description,
          url: canonicalUrl,
          image: ogImage,
          servesCuisine: data.cuisine || "Indian",
          address: {
            "@type": "PostalAddress",
            addressLocality: data.city,
            addressCountry: "IN",
          },
        }),
      },
    };
  } catch {
    return {
      title: "Gangaram - Order Direct, Save on Fees",
      description: "Order food directly from your favourite restaurants.",
    };
  }
}

/**
 * Server component that renders the interactive client component.
 * Initial storefront data is fetched server-side for SEO, then
 * the client component takes over for real-time updates.
 */
export default async function RestaurantDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let initialStorefront: {
    id: string;
    merchantId: string;
    name: string;
    slug: string;
    city: string;
    isOnline: boolean;
    brandColor: string | null;
    cuisine: string | null;
    openingHours: string | null;
    priceForTwo: number | null;
    promoBanner: string | null;
    onboardingStatus: string;
  } | null = null;

  let initialError: string | null = null;

  try {
    getAdminApp();
    const db = getFirestore();

    const snapshot = await db
      .collection("storefronts")
      .where("slug", "==", slug)
      .where("onboardingStatus", "==", "LIVE")
      .limit(1)
      .get();

    if (snapshot.empty) {
      initialError = "Restaurant not found";
    } else {
      const doc = snapshot.docs[0];
      const data = doc.data() as StorefrontDoc;
      initialStorefront = {
        id: doc.id,
        merchantId: doc.id,
        name: data.name,
        slug: data.slug,
        city: data.city,
        isOnline: data.isOnline ?? false,
        brandColor: data.brandColor ?? null,
        cuisine: data.cuisine ?? null,
        openingHours: data.openingHours ?? null,
        priceForTwo: data.priceForTwo ?? null,
        promoBanner: data.promoBanner ?? null,
        onboardingStatus: data.onboardingStatus,
      };
    }
  } catch {
    initialError = "Failed to load restaurant";
  }

  return (
    <RestaurantPageClient
      initialStorefront={initialStorefront}
      initialError={initialError}
    />
  );
}
