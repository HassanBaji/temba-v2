/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { env } from "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: ["@repo/domain", "@repo/validators"],
  eslint: {
    ignoreDuringBuilds: true,
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
