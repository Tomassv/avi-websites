import { NextResponse, type NextRequest } from "next/server";
import { AUTH_REALM, isAuthorized } from "./lib/basic-auth.ts";

/**
 * Basic auth for the internal pages: every route under app/(docs) and app/(deck), plus the
 * product screenshots only value-props uses. lib/internal-routes.test.ts fails if a new
 * internal route is added without a matcher entry here.
 */
export const config = {
  matcher: [
    "/evidence-package",
    "/workflow",
    "/update",
    "/value-props",
    "/aha",
    "/non-connected-value",
    "/aireuropa",
    "/images/values/:path*",
  ],
};

let warned = false;

export function proxy(request: NextRequest) {
  const user = process.env.INTERNAL_USER;
  const password = process.env.INTERNAL_PASSWORD;
  if ((!user || !password) && !warned) {
    warned = true;
    console.warn("INTERNAL_USER / INTERNAL_PASSWORD are not set: internal pages will return 401.");
  }

  if (!isAuthorized(request.headers.get("authorization"), user, password)) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": AUTH_REALM,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
