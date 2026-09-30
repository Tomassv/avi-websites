import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Only public image folders go through the optimizer. /images/values/* sits behind
    // basic auth (proxy.ts) and is served unoptimized, so it must not be reachable here.
    localPatterns: [
      { pathname: "/images/*" },
      { pathname: "/images/cta/**" },
      { pathname: "/images/news/**" },
    ],
  },
  async redirects() {
    return [
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
  },
};

export default nextConfig;
