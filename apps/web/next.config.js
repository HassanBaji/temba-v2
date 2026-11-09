/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { env } from "./src/env.js";

/**
 * Sent on every response. No script CSP: Clerk loads its scripts from the
 * instance's Frontend API, so only framing is restricted.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: ["@repo/domain", "@repo/i18n", "@repo/validators"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    if (!env.API_ORIGIN) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${env.API_ORIGIN}/api/:path*`,
      },
    ];
  },
  async redirects() {
    const consoleOrigin = env.NEXT_PUBLIC_CONSOLE_ORIGIN;
    return [
      {
        source: "/dashboard/hub",
        destination: "/dashboard/groups",
        permanent: true,
      },
      // The Manage area moved to the Venue console (ADR-0031).
      ...(consoleOrigin
        ? [
            {
              source: "/dashboard/manage/:path*",
              destination: consoleOrigin,
              permanent: false,
            },
          ]
        : []),
    ];
  },
};

export default config;
