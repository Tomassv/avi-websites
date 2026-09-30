/**
 * Permanent redirects, used by next.config.ts. Kept here so lib/landing-routes.ts can reserve
 * their paths: a landing page can't take a URL that already redirects.
 */

// Old static pages, redirected to their extensionless routes. An explicit list, so
// unknown *.html URLs still 404.
const legacyPages = [
  "book-demo",
  "evidence-automation",
  "evidence-package",
  "workflow",
  "update",
  "value-props",
  "aha",
  "non-connected-value",
  "aireuropa",
];

export const redirects = [
  { source: "/index.html", destination: "/", permanent: true },
  ...legacyPages.map((page) => ({
    source: `/${page}.html`,
    destination: `/${page}`,
    permanent: true,
  })),
  { source: "/assets/:path*", destination: "/images/:path*", permanent: true },
  { source: "/values/:path*", destination: "/images/values/:path*", permanent: true },
  { source: "/cura_logo.svg", destination: "/images/cura_logo.svg", permanent: true },
];
