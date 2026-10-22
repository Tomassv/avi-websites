import type { NextConfig } from "next";
import { basePath } from "./lib/base-path.ts";

const nextConfig: NextConfig = {
  basePath,
  poweredByHeader: false,
  experimental: {
    // Requests arrive through the www.avilabs.is rewrite, so the Origin differs from this deployment's host.
    serverActions: { allowedOrigins: ["avilabs.is", "www.avilabs.is"] },
  },
  async headers() {
    // proxy.ts sets these on pages too; this also covers the static files it skips.
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        // Nothing may frame the report (clickjacking on the edit page).
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    }];
  },
};

export default nextConfig;
