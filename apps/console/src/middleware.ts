import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/login(.*)", "/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  const returnPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const unauthenticatedUrl = new URL("/login", req.url);
  if (returnPath !== "/") {
    unauthenticatedUrl.searchParams.set("redirect_url", returnPath);
  }
  await auth.protect({ unauthenticatedUrl: unauthenticatedUrl.toString() });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
