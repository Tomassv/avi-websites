import type { MetadataRoute } from "next";
import { site } from "@/lib/content";
import { getLandingPages, isIndexable } from "@/lib/landing";

// The public pages, plus every published landing page that may be indexed. Drafts and
// noindex pages are never listed, in any environment.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1.0 },
    { url: `${site.url}/book-demo`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/evidence-automation`, changeFrequency: "monthly", priority: 0.9 },
    ...getLandingPages()
      .filter(isIndexable)
      .map((p) => ({ url: `${site.url}/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
