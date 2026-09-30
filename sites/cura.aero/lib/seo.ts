import type { Metadata, Viewport } from "next";
import type { Seo } from "./content-types";

/**
 * Metadata API object for a page's seo block. Values are copied as written in content.
 * canonical and og:url are rendered by <SeoLinks> instead: the Metadata API normalises
 * "https://cura.aero/" to "https://cura.aero", and these must stay exactly as written.
 */
export function buildMetadata(seo: Seo): Metadata {
  const og = seo.openGraph;
  const tw = seo.twitter;
  return {
    title: seo.title,
    description: seo.description,
    robots: seo.robots,
    authors: seo.author ? [{ name: seo.author }] : undefined,
    openGraph: og
      ? {
          type: og.type as "website",
          siteName: og.siteName,
          title: og.title,
          description: og.description,
          images: [{ url: og.image, alt: og.imageAlt }],
          locale: og.locale,
        }
      : undefined,
    twitter: tw
      ? {
          card: tw.card as "summary_large_image",
          title: tw.title,
          description: tw.description,
          images: [tw.image],
        }
      : undefined,
  };
}

export function buildViewport(seo: Seo, extra: Viewport = {}): Viewport {
  return { ...(seo.themeColor ? { themeColor: seo.themeColor } : {}), ...extra };
}
