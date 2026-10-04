/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { env } from "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: [
    "@repo/api",
    "@repo/db",
    "@repo/domain",
    "@repo/validators",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    if (!env.API_ORIGIN) return [];
    return [
      {
        source: "/api/remote/:path*",
        destination: `${env.API_ORIGIN}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/hub",
        destination: "/dashboard/groups",
        permanent: true,
      },
    ];
  },
};

export default config;
