import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { PATHNAME_HEADER } from "~/lib/dashboard-onboarding-gate";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
]);
const isDesignPreview = createRouteMatcher(["/dashboard/design(.*)"]);
const isAuthRoute = createRouteMatcher(["/login(.*)", "/signup(.*)"]);
const isWebhookRoute = createRouteMatcher(["/api/webhooks(.*)"]);

/**
 * Continue, carrying the requested path plus search on `x-temba-pathname`.
 * Server Components cannot read the request URL, and the dashboard onboarding
 * gate needs it to build `redirect_url`. Always `set`, never append, so a
 * client-supplied header of the same name cannot reach the gate.
 */
function nextWithPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(
    PATHNAME_HEADER,
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export default clerkMiddleware(async (auth, req) => {
  if (isWebhookRoute(req)) {
    return NextResponse.next();
  }

  // Fixture-fed Home preview is development-only (page 404s in production).
  // Skip auth so the hatch device can be checked without a seeded User.
  if (process.env.NODE_ENV === "development" && isDesignPreview(req)) {
    return nextWithPathname(req);
  }

  if (isProtectedRoute(req)) {
    const returnPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    const redirectUrl = safeInternalRedirect(returnPath);
    const unauthenticatedUrl = redirectUrl
      ? `/login?redirect_url=${encodeURIComponent(redirectUrl)}`
      : "/login";
    await auth.protect({ unauthenticatedUrl });
  }

  const { userId } = await auth();

  if (isAuthRoute(req) && userId) {
    const redirectUrl = safeInternalRedirect(
      req.nextUrl.searchParams.get("redirect_url"),
    );
    return NextResponse.redirect(new URL(redirectUrl ?? "/dashboard", req.url));
  }

  if (req.nextUrl.pathname === "/public") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return nextWithPathname(req);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
