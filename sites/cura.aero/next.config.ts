import type { NextConfig } from "next";
import { redirects } from "./lib/redirects.ts";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Only public image folders go through the optimizer. /images/values/* sits behind
    // basic auth (proxy.ts) and is served unoptimized, so it must not be reachable here.
    localPatterns: [
      { pathname: "/images/*" },
      { pathname: "/images/cta/**" },
      { pathname: "/images/news/**" },
      { pathname: "/images/landing/**" },
    ],
  },
  async redirects() {
    return redirects;
  },
};

export default nextConfig;
