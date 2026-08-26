import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAuthRoute = createRouteMatcher(["/login(.*)", "/signup(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { userId } = await auth();

  if (isAuthRoute(req) && userId) {
    const redirectUrl = safeInternalRedirect(
      req.nextUrl.searchParams.get("redirect_url"),
    );
    return NextResponse.redirect(
      new URL(redirectUrl ?? "/dashboard", req.url),
    );
  }

  if (req.nextUrl.pathname === "/public") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
