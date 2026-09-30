import type { Seo } from "@/lib/content-types";
import { safeHref } from "@/lib/safe-url";

/** Canonical link and og:url, exactly as written in content (React hoists both into <head>). */
export function SeoLinks({ seo }: { seo: Seo }) {
  const canonical = safeHref(seo.canonical);
  const ogUrl = safeHref(seo.openGraph?.url);
  return (
    <>
      {canonical && <link rel="canonical" href={canonical} />}
      {ogUrl && <meta property="og:url" content={ogUrl} />}
    </>
  );
}
