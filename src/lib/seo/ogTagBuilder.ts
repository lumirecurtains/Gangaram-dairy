// ============================================================
// OG TAG BUILDER — Gangaram SEO
// Module 11 — Builds OpenGraph and meta tag objects
// ============================================================

export interface OgTagInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  url: string;
  siteName?: string;
}

export interface OgTagResult {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string | null;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string | null;
  canonical: string;
  schemaJson: Record<string, unknown>;
}

const DEFAULT_SITE_NAME = "Gangaram";
const DEFAULT_DESCRIPTION = "Order food directly from your favourite restaurants. Better prices, no middleman fees.";

/**
 * Builds a complete set of OpenGraph and Twitter card meta tags
 * for a restaurant detail page.
 */
export function buildOgTags(input: OgTagInput): OgTagResult {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gangaram.app";
  const fullUrl = input.url.startsWith("http") ? input.url : `${siteUrl}${input.url}`;

  return {
    title: input.title,
    description: input.description || DEFAULT_DESCRIPTION,
    ogTitle: input.title,
    ogDescription: input.description || DEFAULT_DESCRIPTION,
    ogUrl: fullUrl,
    ogImage: input.imageUrl || null,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: input.title,
    twitterDescription: input.description || DEFAULT_DESCRIPTION,
    twitterImage: input.imageUrl || null,
    canonical: fullUrl,
    schemaJson: {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: input.title,
      description: input.description,
      url: fullUrl,
      image: input.imageUrl,
    },
  };
}

/**
 * Builds the sitemap XML entry for a single storefront URL.
 */
export function buildSitemapEntry(
  url: string,
  lastModified: Date,
  priority: number = 0.8
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gangaram.app";
  const fullUrl = url.startsWith("http") ? url : `${siteUrl}${url}`;
  const lastMod = lastModified.toISOString();

  return `
  <url>
    <loc>${escapeXml(fullUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Escapes special XML characters in a string.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
